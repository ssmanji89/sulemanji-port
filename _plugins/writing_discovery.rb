# frozen_string_literal: true

require 'cgi'
require 'date'
require_relative '../scripts/verify_writing' unless defined?(WritingContract)

module WritingDiscovery
  module_function

  SKY_ROUTE = '/notes/late-october-skywatching-binoculars-telescope' unless const_defined?(:SKY_ROUTE)
  SKY_IMAGE = {
    'path' => '/assets/images/articles/late-october-skywatching-binoculars-01.webp',
    'width' => 1200,
    'height' => 630,
    'alt' => 'A skywatcher under stars, illustrating late-October observing'
  }.freeze unless const_defined?(:SKY_IMAGE)

  def default_image(article, author)
    return SKY_IMAGE.dup if article.data['permalink'] == SKY_ROUTE

    slug = article.data['permalink'].split('/').last
    {
      'path' => "/assets/images/articles/#{slug}-social.png",
      'width' => 1200,
      'height' => 630,
      'alt' => "Social card for \"#{article.data['title']}\" by #{author}"
    }
  end

  def qualify_commercial_links(html, registry)
    html.gsub(/<a\b[^>]*>/i) do |tag|
      href_match = tag.match(/\bhref=(['"])(.*?)\1/i)
      next tag unless href_match

      href = CGI.unescapeHTML(href_match[2])
      next tag unless WritingContract.classify_commercial_href(href, registry)

      rel_match = tag.match(/\brel=(['"])(.*?)\1/i)
      tokens = rel_match ? rel_match[2].split : []
      tokens = (tokens + %w[sponsored nofollow]).uniq
      if rel_match
        tag.sub(rel_match[0], %(rel=#{rel_match[1]}#{tokens.join(' ')}#{rel_match[1]}))
      else
        tag.sub(/>\z/, %( rel="#{tokens.join(' ')}">))
      end
    end
  end

  def context_registry(site)
    WritingContract.article_context_registry(site.data.fetch('article-context'))
  rescue KeyError
    raise WritingContract::Error, '_data/article-context.yml: required'
  end
end

module Jekyll
  class WritingDiscoveryGenerator < Generator
    safe true
    priority :highest

    def generate(site)
      catalog = WritingContract.catalog(site.source, as_of: Date.today)
      contexts = WritingDiscovery.context_registry(site)
      public_routes = (catalog.active + catalog.legacy).map { |article| article.data['permalink'] }
      unknown_contexts = contexts.keys - public_routes
      unless unknown_contexts.empty?
        raise WritingContract::Error, "article context: unknown route #{unknown_contexts.first}"
      end
      author = site.config.fetch('person').fetch('name')
      pages = site.pages.each_with_object({}) { |page, index| index[page.path] = page }
      active = catalog.active.map do |article|
        present(pages.fetch(article.path), article, author, contexts)
      end
      legacy = catalog.legacy.map do |article|
        present(pages.fetch(article.path), article, author, contexts, legacy: true)
      end
      site.data['writing_discovery'] = {'articles' => active, 'legacy' => legacy}
    rescue KeyError => error
      raise Errors::FatalException, "Writing discovery page missing: #{error.message}"
    rescue WritingContract::Error => error
      raise Errors::FatalException, "Writing discovery catalog invalid: #{error.message}"
    end

    private

    def present(page, article, author, contexts, legacy: false)
      page.data['writing_public'] = true
      page.data['writing_legacy'] = legacy
      page.data['layout'] = 'writing-legacy' if legacy
      image = (article.data['social_image'] || WritingDiscovery.default_image(article, author)).dup
      image['alt'] = CGI.escapeHTML(image['alt'])
      page.data['image'] = image
      page.data['twitter'] = {'card' => 'summary_large_image'}
      page.data['article_context'] = contexts[article.data['permalink']]
      page
    end
  end

  Hooks.register :pages, :post_render do |page|
    next unless page.data['writing_public']

    registry = WritingContract.commercial_registry(page.site.source)
    page.output = WritingDiscovery.qualify_commercial_links(page.output, registry)
    page.output = page.output.sub(
      /(<meta property="og:type" content=")[^"]+(" \/>)/,
      '\\1article\\2'
    )
  end
end
