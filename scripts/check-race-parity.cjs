// Run from the frontend checkout: node scripts/check-race-parity.cjs [backend path]
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

// Load both repositories' actual TypeScript implementations without building apps.
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  module._compile(outputText, filename)
}
const frontend = path.resolve(__dirname, '../src/features/training')
const backend = path.resolve(process.argv[2] || path.join(__dirname, '../../synapse-backend'))
const { NeatPopulation } = require(path.join(frontend, 'neat/population.ts'))
const { evaluateGenome } = require(path.join(frontend, 'neat/genome.ts'))
const { generateTrack } = require(path.join(frontend, 'domain/track.ts'))
const { calculateFitness } = require(path.join(frontend, 'domain/fitness.ts'))
const { createSimulationState, senseSimulation, stepSimulation } = require(path.join(frontend, 'simulation/race-contract.ts'))
const { RaceSimulation, senseTrack } = require(path.join(backend, 'src/modules/multiplayer/domain/race.simulation.ts'))
const { evaluateNeatGenome } = require(path.join(backend, 'src/modules/multiplayer/domain/neat-controller.ts'))
const { generateTrack: generateServerTrack } = require(path.join(backend, 'src/modules/multiplayer/domain/track.ts'))
let comparisons = 0

function evaluate(genome, recipe) {
  const track = generateTrack(recipe)
  const serverTrack = generateServerTrack(recipe)
  assert.deepEqual(track.geometry, serverTrack.geometry)
  assert.deepEqual(track.boundaries, serverTrack.boundaries)
  assert.deepEqual(track.checkpoints.map(checkpoint => ({
    x: checkpoint.position[0], z: checkpoint.position[2], yaw: checkpoint.rotationY,
    halfWidth: checkpoint.size[0] / 2, halfDepth: checkpoint.size[2] / 2,
  })), serverTrack.checkpoints)
  const state = createSimulationState(track)
  const race = new RaceSimulation([{ userId: 'test', username: 'test', genome }], 0, serverTrack)
  assert.deepEqual({ x: state.x, z: state.z, yaw: state.yaw }, serverTrack.spawn)
  for (let step = 0; step < (['technical-loop-v2', 'grand-prix-v3'].includes(recipe.version) ? 3600 : 560); step++) {
    const sensors = senseSimulation(state, track)
    assert.deepEqual(sensors, senseTrack(state.x, state.z, state.yaw, serverTrack))
    const inputs = [...sensors, Math.min(1, Math.abs(state.speed) / 13)]
    const outputs = evaluateGenome(genome, inputs)
    assert.deepEqual(outputs, evaluateNeatGenome(genome, inputs))
    const result = stepSimulation(state, ...outputs, track)
    const snapshot = race.tick(race.startAt + step * 50)
    const player = snapshot.players[0]
    for (const key of ['x', 'z', 'yaw', 'speed', 'expectedCheckpoint', 'passedCheckpoints', 'laps']) {
      assert.equal(state[key], player[key], `${genome.id}, seed ${recipe.seed}, step ${step}, ${key}`)
    }
    assert.equal(result.finished, snapshot.status === 'FINISHED')
    assert.equal(result.collision, player.eliminationReason === 'COLLISION')
    assert.equal(result.stalled && !result.collision, player.eliminationReason === 'STALLED')
    comparisons++
    if (result.finished) return state
  }
  throw new Error('Simulation did not terminate')
}

const seeds = [0, 1, 2, 7, 42, 123, 124, 42170, 999999, 2147483647]
let populationsWithoutFinishers = 0
for (const seed of seeds) {
  const population = new NeatPopulation(seed)
  let completed = 0
  for (const genome of population.genomes) {
    completed += evaluate(genome, { version: 'curved-loop-v1', seed }).laps
    evaluate(genome, { version: 'rectangular-ring-v1', seed })
    evaluate(genome, { version: 'technical-loop-v2', seed })
    evaluate(genome, { version: 'grand-prix-v3', seed })
  }
  console.log(`Initial population, seed ${seed}: ${completed}/${population.genomes.length} completed the curved track`)
  if (completed === 0) populationsWithoutFinishers++
}
assert.ok(populationsWithoutFinishers > 0, 'Initial populations must not have a guaranteed finisher')

// Exercise evolved connections/hidden nodes and replay the saved elite on a new track.
const population = new NeatPopulation(42170)
for (let generation = 0; generation < 12; generation++) {
  const fitness = new Map()
  for (const genome of population.genomes) {
    const state = evaluate(genome, population.config.track)
    fitness.set(genome.id, calculateFitness({
      aliveSeconds: state.elapsedSteps / 20,
      traveledDistance: state.traveledDistance,
      collided: state.collided,
    }, state))
  }
  population.evolve(fitness)
}
const champion = JSON.parse(JSON.stringify(population.toSnapshot().genomes[0]))
for (const seed of [42170, 7, 123, 999999]) {
  const state = evaluate(champion, { version: 'curved-loop-v1', seed })
  console.log(`Generation 12 elite, track ${seed}: ${state.passedCheckpoints} checkpoints, ${state.laps} laps, collision=${state.collided}`)
}
console.log(`Parity verified: ${comparisons} steps (sensors, NEAT outputs, motion, checkpoints and termination).`)
