export const defaultLang = 'en';
export const languages = { en: 'EN' } as const;

export const ui = {
  en: {
    'nav.posts': 'Posts',
    'nav.projects': 'Projects',
    'nav.tags': 'Tags',
    'nav.poems': 'Poems',
    'nav.contact': 'Contact',
    'nav.getInTouch': 'Get in touch',
    'nav.home': 'Home',
    'home.strip': "Writing about Vue, Django, and whatever I'm tinkering with",
    'home.readWriting': 'Read the writing',
    'home.seeAllPosts': 'See all {n} posts',
    'home.seeAllProjects': 'See all {n} projects',
    'home.seeAllPoems': 'See all {n} poems',
    'home.contactLead':
      'Based in Turkey. The easiest way to reach me is GitHub: open an issue, start a discussion, or just say hi.',
    'footer.bio': 'Software developer. Vue, Django, and REST APIs.',
    'footer.site': 'Site',
    'footer.elsewhere': 'Elsewhere',
    'notfound.back': 'Back to home',
    'poems.title': 'Poems',
    'poems.description': 'A few poems I write every now and then.',
    'home.greeting': "Mertcan Taş",
    'home.intro1':
      "I’m a software developer from Turkey, mostly working with Vue, Django, and REST APIs. This is just my own little corner of the web — a place to jot down what I learn and tinker with the occasional side project.",
    'home.intro2':
      "Most of what I write comes from things I run into while building: bugs I fixed, tools I liked, ideas I wanted to remember. Writing them down helps me learn — and maybe it helps someone else too.",
    'home.recentPosts': 'Writing',
    'home.allPosts': 'all →',
    'home.myProjects': 'Projects',
    'home.allProjects': 'all →',
    'home.poems': 'Poems',
    'home.allPoems': 'all →',
    'home.contact': 'Contact',
    'home.contactText': 'Easiest way to reach me is',
    'posts.title': 'All posts',
    'posts.description': 'Articles, guides, tutorials about full-stack development.',
    'tags.title': 'All Tags',
    'tags.description':
      'Post tags: concise keywords categorizing content for easy navigation and improved searchability',
    'tags.taggedWith': 'All Posts Tagged with',
    'projects.title': 'All My Projects',
    'projects.description':
      'All my project portfolio from real projects to open source projects.',
    'post.publishedOn': 'Published on',
    'post.updatedOn': 'Updated on',
    'footer.poweredPre': 'Powered by',
    'footer.poweredPost': '',
    'author.heading': 'About the Author',
    'author.bio':
      'Mertcan Taş is a software developer from Turkey who works mostly with Vue, Django, and REST APIs, and likes writing about what he learns along the way.',
    'about.title': 'About Me',
    'about.p1':
      "I’m a software developer from Turkey, mostly working with Vue, Django, and REST APIs. I like building things, taking them apart, and figuring out how they actually work.",
    'about.p2':
      "This is just my personal corner of the web. I use it to keep notes on what I learn and to share the odd tool or side project — mostly so I don’t forget, and maybe so it saves someone else a bit of time.",
    'about.p3':
      "Coding is something I genuinely enjoy, not only a job. I like keeping things simple and building tools that feel good to use. Writing about what I learn is just part of how I keep getting better at it.",
    'notfound.title': 'Page Not Found',
    'notfound.body':
      "The page you're looking for is either moved or no longer exists. Please contact the site owner that linked you to the original URL and let them know their link is broken.",
    'card.article': 'Article',
    'card.details': 'Details',
    'card.demo': 'Demo',
    'card.github': 'GitHub',
    'project.fernetrix.description':
      'A developer tool for generating secure Django secret keys',
  },
} as const;

export type Lang = keyof typeof ui;

export function useTranslations(lang: Lang) {
  return function t(key: keyof (typeof ui)['en']): string {
    return (ui[lang] as Record<string, string>)[key] ?? (ui.en as Record<string, string>)[key];
  };
}
