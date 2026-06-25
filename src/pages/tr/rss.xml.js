import rss from '@astrojs/rss';
import { SITE_TITLE, SITE_DESCRIPTION } from '../../consts';
import { getPostsByLang } from '../../i18n/content';

export async function GET(context) {
	const posts = await getPostsByLang('tr');
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: `/tr/${post.id}/`,
		})),
	});
}
