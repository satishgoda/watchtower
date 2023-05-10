import { defineConfig } from 'vitepress'
import { html5Media } from 'markdown-it-html5-media'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Watchtower",
  description: "Visual production tracking.",
  lastUpdated: true,
  cleanUrls: true,
  srcExclude: ['**/README.md',],
  themeConfig: {
    footer: {
      copyright: '(CC) Blender Foundation | studio.blender.org'
    },
    editLink: {
      pattern: 'https://projects.blender.org/studio/watchtower/_edit/main/docs/:path'
    },
    search: {
      provider: 'local'
    },
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Get Involved', link: '/get-involved' },
      { text: 'Source Code', link: 'https://projects.blender.org/studio/watchtower' },
    ],

    sidebar: [
      {
        text: 'Usage',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Integration', link: '/integration'},
          { text: 'Deployment', link: '/deployment'}
        ]
      },
      {
        text: 'Development',
        items: [

          { text: 'Pipeline', link: '/develop-pipeline'},
          { text: 'Web Client', link: '/develop-client-web'},
        ]
      }
    ],
  },
  markdown: {
    config: (md) => {
      // Enable the markdown-it-html5-media plugin
      md.use(html5Media)
    }
  }

})
