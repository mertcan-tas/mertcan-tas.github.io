import { getRepositoryDetails } from '../../utils';

export interface Project {
	name: string;
	demoLink: string;
	tags?: string[];
	description?: string | { en: string; tr: string };
	postLink?: string;
	demoLinkRel?: string;
	[key: string]: any;
}

export const projects: Project[] = [
	{
		name: 'Fernetrix',
		description: {
			en: 'A developer tool for generating secure Django secret keys',
			tr: 'Güvenli Django secret key’leri üreten bir geliştirici aracı'
		},
		demoLink: 'https://www.fernetrix.com',
		demoLinkRel: 'nofollow noopener noreferrer',
		tags: ['Tool', 'Django']
	}
];
