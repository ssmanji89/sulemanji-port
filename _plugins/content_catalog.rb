require 'json'
require 'set'
require 'uri'
require 'yaml'
require 'jekyll'

module Sulemanji
  module ContentCatalog
    KINDS = %w[project-family tool essay experiment field-note profile].freeze
    AVAILABILITY = %w[public-source package demo historical explanation-only].freeze
    RELATIONS = %w[implementation continuation explanation source shared-question].freeze
    FIELDS = %w[id canonical_url kind title summary topics availability source_refs related_ids authored_fields updated_on].freeze
    PROTECTED_ARTICLE_FIELDS = %w[published_on permalink].freeze
    module_function

    def validate(records:, relations:, topics:, known_urls:)
      errors = []
      topic_ids = topics.is_a?(Hash) ? topics.keys : Array(topics)
      errors << 'records must be an array' unless records.is_a?(Array)
      errors << 'relations must be an array' unless relations.is_a?(Array)
      return errors unless records.is_a?(Array) && relations.is_a?(Array)

      ids = records.filter_map { |item| item['id'] if item.is_a?(Hash) }
      errors << 'record ids must be unique' unless ids.uniq == ids
      routes = records.filter_map { |item| item['canonical_url'] if item.is_a?(Hash) }
      errors << 'canonical URLs must be unique' unless routes.uniq == routes
      ids_set = ids.to_set
      records.each do |item|
        unless item.is_a?(Hash)
          errors << 'record must be a mapping'
          next
        end
        id = item['id'].to_s
        errors << "#{id}: invalid fields" unless (item.keys - FIELDS).empty?
        %w[id title summary canonical_url].each do |field|
          errors << "#{id}: #{field} required" unless item[field].is_a?(String) && !item[field].strip.empty?
        end
        errors << "#{id}: invalid id" unless /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/.match?(id)
        errors << "#{id}: invalid kind" unless KINDS.include?(item['kind'])
        path = item['canonical_url']
        errors << "#{id}: invalid canonical URL" unless path.is_a?(String) && path.start_with?('/') && !path.start_with?('//')
        if path.is_a?(String) && path.start_with?('/notes/') && !Array(known_urls).include?(path)
          errors << "#{id}: unknown article URL"
        end
        item_topics = item['topics']
        unless item_topics.is_a?(Array) && !item_topics.empty?
          errors << "#{id}: topics must be a non-empty array"
        else
          unknown = item_topics - topic_ids
          errors << "#{id}: unknown topic(s): #{unknown.join(', ')}" unless unknown.empty?
        end
        availability = item['availability']
        errors << "#{id}: invalid availability" unless availability.is_a?(Array) && !availability.empty? && (availability - AVAILABILITY).empty?
        refs = item['source_refs']
        errors << "#{id}: source_refs must be an array" unless refs.is_a?(Array)
        Array(refs).each do |ref|
          uri = URI.parse(ref.to_s)
          errors << "#{id}: source URL must be public HTTPS" unless uri.is_a?(URI::HTTPS) && uri.host && !uri.host.match?(/\A(?:localhost|.*\.local)\z/i) && !uri.host.match?(/\A(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/)
        rescue URI::InvalidURIError
          errors << "#{id}: invalid source URL"
        end
        errors << "#{id}: related_ids must be an array" unless item['related_ids'].is_a?(Array)
        if item['related_ids'].is_a?(Array)
          (item['related_ids'] - ids).each { |target| errors << "#{id}: unknown related id #{target}" }
        end
        if item['authored_fields'].is_a?(Hash) && (item['authored_fields'].keys & PROTECTED_ARTICLE_FIELDS).any?
          errors << "#{id}: published_on and permalink remain authoritative article fields"
        end
      end
      relations.each do |relation|
        unless relation.is_a?(Hash)
          errors << 'relation must be a mapping'
          next
        end
        from = relation['from_id']
        to = relation['to_id']
        errors << "relation: missing source #{from}" unless ids_set.include?(from)
        errors << "relation: missing target #{to}" unless ids_set.include?(to)
        errors << "#{from}->#{to}: invalid relation" unless RELATIONS.include?(relation['relation'])
        errors << "#{from}->#{to}: reason required" unless relation['reason'].is_a?(String) && !relation['reason'].strip.empty?
      end
      errors
    end

    def topics_with_items(topics:, items:)
      topics.select do |topic_id, _label|
        items.any? { |item| Array(item['topics']).include?(topic_id) }
      end
    end

    def build(site)
      root = site.source
      read = ->(name) { YAML.safe_load(File.read(File.join(root, '_data', name)), aliases: false) || [] }
      records = read.call('content-catalog.yml')
      relations = read.call('content-relations.yml')
      topics = YAML.safe_load(File.read(File.join(root, '_data', 'writing.yml')), aliases: false).fetch('topics')
      known_urls = site.pages.map { |page| page.url } + site.posts.docs.map { |doc| doc.url }
      articles = site.pages.filter_map do |page|
        data = page.data
        next unless page.url.start_with?('/notes/') && data['layout'] == 'writing-article' && data['published']

        {
          'id' => page.url.delete_prefix('/notes/'), 'canonical_url' => page.url,
          'kind' => 'field-note', 'title' => data['title'], 'summary' => data['description'],
          'topics' => Array(data['topics']), 'availability' => ['historical', 'public-source'],
          'source_refs' => [], 'related_ids' => [], 'authored_fields' => []
        }
      end
      errors = validate(records: records + articles, relations: relations, topics: topics, known_urls: known_urls)
      raise Jekyll::Errors::FatalException, "content catalog invalid: #{errors.join('; ')}" unless errors.empty?
      items = (records + articles).map do |record|
        record.merge('related_ids' => relations.select { |r| r['from_id'] == record['id'] }.map { |r| r['to_id'] })
      end
      {'items' => items, 'topics' => topics, 'relations' => relations}
    end
  end

  class ContentCatalogGenerator < Jekyll::Generator
    priority :highest

    def generate(site)
      catalog = ContentCatalog.build(site)
      site.data['content_catalog'] = catalog
      page = Jekyll::PageWithoutAFile.new(site, site.source, '', 'content-index.json')
      page.data['layout'] = nil
      page.data['sitemap'] = false
      page.content = JSON.pretty_generate(schema_version: 1, items: catalog['items'], topics: catalog['topics'], relations: catalog['relations'])
      site.pages << page
      ContentCatalog.topics_with_items(topics: catalog['topics'], items: catalog['items']).each do |topic_id, label|
        topic_page = Jekyll::PageWithoutAFile.new(site, site.source, 'explore/topics', "#{topic_id}.html")
        topic_page.data['layout'] = 'content-topic'
        topic_page.data['title'] = label
        topic_page.data['topic_id'] = topic_id
        topic_page.data['topic_label'] = label
        topic_page.data['wide_content'] = true
        topic_page.data['content_items'] = catalog['items'].select { |item| item['topics'].include?(topic_id) }
        topic_page.data['permalink'] = "/explore/topics/#{topic_id}/"
        site.pages << topic_page
      end
    end
  end
end
