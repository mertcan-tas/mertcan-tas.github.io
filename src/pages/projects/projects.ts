import { getRepositoryDetails } from "../../utils";

export interface Project {
  name: string;
  demoLink: string;
  tags?: string[],
  description?: string;
  postLink?: string;
  demoLinkRel?: string;
  [key: string]: any;
}

export const projects: Project[] = [
  {
    name: 'Fernetrix',
    description: 'A developer tool for generating secure Fernet and Django secret keys',
    demoLink: 'https://www.fernetrix.com',
    demoLinkRel: 'nofollow noopener noreferrer',
    tags: ['Tool', 'Security', 'Django']
  }
]
