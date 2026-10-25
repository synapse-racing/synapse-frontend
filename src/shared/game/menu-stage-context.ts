import { createContext, useContext } from 'react'

export type MenuTheme = 'desert' | 'tournament'
export const MenuStageContext = createContext({
  preview: (_theme: MenuTheme) => {},
})
export function useMenuStage() {
  return useContext(MenuStageContext)
}
