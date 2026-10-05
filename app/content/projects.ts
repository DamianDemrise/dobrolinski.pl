import { workshop } from './workshop'

/**
 * Autorskie projekty jako seria: 01, 02, 03… Kolejny projekt to kolejny wpis
 * na liście; blok „Teraz” na głównej pokazuje projekt oznaczony jako bieżący.
 */
export interface Project {
  number: string
  name: string
  path: string
  lead: string
}

export const projects: readonly Project[] = [
  { number: workshop.number, name: workshop.name, path: workshop.path, lead: workshop.hero.lead },
]

export const currentProject: Project = projects[0]!

export const projectLabel = (project: Project) => `${project.number} / ${project.name}`
