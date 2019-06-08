import { isRedirect, ServerLocation } from '@reach/router'
import { Request, Response } from 'express'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { getMarkupFromTree, ApolloProvider } from 'react-apollo-hooks'
import { App } from 'ui/App'
import { Config, ConfigProvider } from 'ui/components/ConfigProvider'
import { Document } from 'ui/Document'
import { initApollo } from 'ui/lib/initApollo'
import { HeadProvider } from 'ui/components/HeadProvider'

export default async function(req: Request, res: Response, config: Config) {
  let html = ''
  const assetPaths = '../public/assets.json'
  const routes = (await import(assetPaths)).default as { client: string }
  const scripts = Object.entries(routes).map(([, src]) => ({
    src,
  }))
  const client = initApollo({ baseUrl: config.baseUrl })

  let head: JSX.Element[] = [
    <meta key='viewport' name='viewport' content='width=device-width, initial-scale=1' />,
  ]

  try {
    html = await getMarkupFromTree({
      renderFunction: renderToString,
      tree: (
        <ServerLocation url={req.url}>
          <ConfigProvider {...config}>
            <HeadProvider tags={head}>
              <ApolloProvider client={client}>
                <App />
              </ApolloProvider>
            </HeadProvider>
          </ConfigProvider>
        </ServerLocation>
      ),
    })
  } catch (error) {
    if (isRedirect(error)) {
      res.redirect(error.uri)
    } else {
      throw error
    }
  }

  const state = client.cache.extract()

  const document = renderToString(
    <Document
      html={html}
      state={{ APOLLO_STATE: state, CONFIG: config, HEAD: head }}
      scripts={scripts}
    />,
  )
  res.status(200).send(`<!DOCTYPE html>${document}`)
}
