# frozen_string_literal: true

require 'date'
require_relative '../scripts/verify_writing' unless defined?(WritingContract)

module Jekyll
  class WritingDiscoveryGenerator < Generator
    safe true
    priority :highest

    def generate(site)
      catalog = WritingContract.catalog(site.source, as_of: Date.today)
      pages = site.pages.each_with_object({}) { |page, index| index[page.path] = page }
      active = catalog.active.map { |article| pages.fetch(article.path) }
      legacy = catalog.legacy.map { |article| pages.fetch(article.path) }
      site.data['writing_discovery'] = {
        'articles' => active,
        'legacy' => legacy
      }
    rescue KeyError => error
      raise Errors::FatalException, "Writing discovery page missing: #{error.message}"
    rescue WritingContract::Error => error
      raise Errors::FatalException, "Writing discovery catalog invalid: #{error.message}"
    end
  end
end

