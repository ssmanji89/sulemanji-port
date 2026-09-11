#!/usr/bin/env ruby
# Structural publication checks for the Writing surface.
# A pass is necessary, never evidence of editorial/source/privacy approval.

require 'date'
require 'json'
require 'optparse'
require 'pathname'
require 'psych'
require 'uri'

module WritingContract
  Error = Class.new(StandardError)
  Article = Struct.new(:path, :data, :legacy, keyword_init: true)
  Catalog = Struct.new(:active, :drafts, :legacy, :registry, keyword_init: true)

  FIELDS = %w[
    writing_schema layout title description permalink published
    published_on updated_on article_type time_horizon topics reader
  ].freeze
  MAPS = %w[article_types time_horizons readers topics].freeze
  REGISTRY_FIELDS = (['schema_version', 'legacy_paths'] + MAPS).freeze
  LEGACY_ROUTES = {
    'notes/agent-safety-from-incidents.md' => '/notes/agent-safety'
  }.freeze
  LEGACY_PATHS = LEGACY_ROUTES.keys.freeze

  module_function

  def check(condition, message)
    raise Error, message unless condition
  end

  def yaml(text, label)
    stream = Psych.parse_stream(text)
    check(stream.children.length == 1, "#{label}: one YAML document required")

    walk = lambda do |node|
      check(!node.is_a?(Psych::Nodes::Alias), "#{label}: YAML aliases forbidden")
      if node.is_a?(Psych::Nodes::Mapping)
        keys = node.children.each_slice(2).map(&:first)
        check(keys.all? { |key| key.is_a?(Psych::Nodes::Scalar) }, "#{label}: scalar keys required")
        names = keys.map(&:value)
        check(names.uniq == names, "#{label}: duplicate YAML key")
      end
      Array(node.children).each { |child| walk.call(child) }
    end
    walk.call(stream)

    value = Psych.safe_load(text, permitted_classes: [Date, Time], aliases: false)
    check(value.is_a?(Hash) && value.keys.all? { |key| key.is_a?(String) }, "#{label}: mapping required")
    value
  rescue Psych::Exception => e
    raise Error, "#{label}: invalid YAML (#{e.class})"
  end

  def frontmatter(path)
    text = path.read(encoding: 'UTF-8')
    check(text.valid_encoding?, "#{path.basename}: invalid UTF-8")
    match = /\A---\s*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|\z)(.*)\z/m.match(text)
    check(match, "#{path.basename}: front matter required")
    [yaml(match[1], path.basename.to_s), match[2]]
  end

  def iso(value, label)
    check(value.is_a?(String) && /\A\d{4}-\d{2}-\d{2}\z/.match?(value),
          "#{label}: quoted ISO date required")
    Date.iso8601(value)
  rescue Date::Error
    raise Error, "#{label}: invalid calendar date"
  end

  def registry(source)
    path = Pathname(source) / '_data/writing.yml'
    data = yaml(path.read, 'writing registry')
    check((data.keys - REGISTRY_FIELDS).empty?, 'writing registry: unknown field')
    check(data['schema_version'] == 1, 'writing registry: unsupported version')

    MAPS.each do |key|
      map = data[key]
      check(map.is_a?(Hash) && !map.empty?, "writing registry: #{key} required")
      map.each do |slug, label|
        check(slug.is_a?(String) && /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/.match?(slug),
              "writing registry: invalid #{key} key")
        check(label.is_a?(String) && !label.strip.empty?,
              "writing registry: invalid #{key} label")
      end
    end

    legacy = data['legacy_paths']
    check(legacy.is_a?(Array) && legacy.uniq == legacy,
          'writing registry: unique legacy paths required')
    check(legacy.all? { |path| path.is_a?(String) && /\Anotes\/[a-z0-9-]+\.md\z/.match?(path) },
          'writing registry: invalid legacy path')
    check((legacy - LEGACY_PATHS).empty?,
          'writing registry: unrecognized legacy path')
    check((LEGACY_PATHS - legacy).empty?,
          'writing registry: canonical legacy path required')
    data
  rescue Errno::ENOENT => e
    raise Error, "required source file missing: #{e.message}"
  end

  def catalog(source, as_of:)
    source = Pathname(source).expand_path
    check(as_of.is_a?(Date), 'as_of: Date required')
    data_registry = registry(source)

    notes_dir = source / 'notes'
    check(notes_dir.directory?, 'notes: directory required')
    entries = notes_dir.glob('**/*', File::FNM_DOTMATCH).reject do |path|
      %w[. ..].include?(path.basename.to_s)
    end
    check(entries.none?(&:symlink?), 'notes: symbolic links forbidden')
    paths = entries.select(&:file?)
    check(paths.all? { |path| path.parent == notes_dir && path.extname == '.md' },
          'notes: flat Markdown-only article directory required')

    articles = paths.sort.map do |path|
      relative = path.relative_path_from(source).to_s
      front, body = frontmatter(path)

      %w[title description permalink].each do |field|
        check(front[field].is_a?(String) && !front[field].strip.empty?,
              "#{relative}: #{field} required")
      end
      check(/\A\/notes\/[a-z0-9]+(?:-[a-z0-9]+)*\z/.match?(front['permalink']),
            "#{relative}: invalid permalink")

      legacy = data_registry['legacy_paths'].include?(relative)
      if legacy
        check(front['permalink'] == LEGACY_ROUTES.fetch(relative),
              "#{relative}: canonical legacy permalink required")
      else
        %w[title description].each do |field|
          check(!/[<>]|\{[%{]/.match?(front[field]),
                "#{relative}: plain #{field} text required")
        end
        check((front.keys - FIELDS).empty?, "#{relative}: unknown front matter field")
        check(front['writing_schema'].instance_of?(Integer) && front['writing_schema'] == 1,
              "#{relative}: writing_schema must be 1")
        check(front['layout'] == 'writing-article',
              "#{relative}: writing-article layout required")
        check([true, false].include?(front['published']),
              "#{relative}: published must be boolean")
        check(front['permalink'] == "/notes/#{path.basename('.md')}",
              "#{relative}: slug and permalink must agree")

        {
          'article_type' => 'article_types',
          'time_horizon' => 'time_horizons',
          'reader' => 'readers'
        }.each do |field, map|
          check(data_registry[map].key?(front[field]), "#{relative}: invalid #{field}")
        end

        topics = front['topics']
        check(topics.is_a?(Array) && (1..4).cover?(topics.length) &&
              topics.uniq == topics && topics.all? { |topic| data_registry['topics'].key?(topic) },
              "#{relative}: invalid topics")

        check(!body.strip.empty?, "#{relative}: empty body")
        check(!body.include?('{%') && !body.include?('{{'),
              "#{relative}: executable Liquid forbidden in article body")
        check(!body.match?(/<(?:!--|\/?[A-Za-z])/),
              "#{relative}: raw HTML forbidden in article body")
        check(body.lines.none? { |line| line.match?(/\A#\s+/) },
              "#{relative}: article body must begin below H1")

        if front['published']
          published = iso(front['published_on'], "#{relative}: published_on")
          check(published <= as_of, "#{relative}: future publication date")
          if front['updated_on']
            updated = iso(front['updated_on'], "#{relative}: updated_on")
            check(updated >= published && updated <= as_of,
                  "#{relative}: invalid update chronology")
          end
        else
          check(front['published_on'].nil? && front['updated_on'].nil?,
                "#{relative}: unpublished draft must have null/absent dates")
        end
      end

      Article.new(path: relative, data: front, legacy: legacy)
    end

    check((data_registry['legacy_paths'] - articles.map(&:path)).empty?,
          'writing registry: missing legacy source')
    urls = articles.map { |article| article.data['permalink'] }
    check(urls.uniq == urls, 'notes: duplicate permalink')

    nonlegacy = articles.reject(&:legacy)
    active = nonlegacy.select { |article| article.data['published'] }.sort_by do |article|
      [-Date.iso8601(article.data['published_on']).jd, article.data['permalink']]
    end

    Catalog.new(
      active: active,
      drafts: nonlegacy.reject { |article| article.data['published'] },
      legacy: articles.select(&:legacy).sort_by { |article| article.data['permalink'] },
      registry: data_registry
    )
  end

  def require_nokogiri
    require 'nokogiri'
  rescue LoadError => e
    raise Error, "rendered verification requires Nokogiri: #{e.message}"
  end

  def output(root, route)
    check(/\A\/[a-z0-9\/-]+\z/.match?(route), 'output: unsafe route')
    base = Pathname(root).expand_path / route.delete_prefix('/')
    matches = [base, Pathname("#{base}.html"), base / 'index.html'].select(&:file?)
    check(matches.length <= 1, "#{route}: ambiguous rendered output")
    matches.first
  end

  def nodes(value)
    case value
    when Hash then [value] + value.values.flat_map { |item| nodes(item) }
    when Array then value.flat_map { |item| nodes(item) }
    else []
    end
  end

  def document(root, route, origin:, baseurl:, expected_scripts:)
    require_nokogiri
    path = output(root, route)
    check(path, "#{route}: rendered route missing")
    doc = Nokogiri::HTML(path.read)

    %w[html main h1 title].each do |tag|
      check(doc.css(tag).length == 1, "#{route}: exactly one #{tag}")
    end

    canonical = doc.css('link[rel="canonical"]').map { |node| node['href'] }
    check(canonical == [origin + baseurl + route], "#{route}: canonical mismatch")
    check(doc.css('meta[name="description"]').length == 1,
          "#{route}: one description required")
    check(doc.css('form').empty?, "#{route}: unexpected form")

    scripts = doc.css('script').reject { |node| node['type'] == 'application/ld+json' }
    rendered_scripts = scripts.map { |node| [node['src'], node.text.strip] }
    check(rendered_scripts == expected_scripts, "#{route}: unexpected executable script")

    schemas = doc.css('script[type="application/ld+json"]').flat_map do |node|
      nodes(JSON.parse(node.text))
    end
    people = schemas.select { |node| node['@type'] == 'Person' }
    check(people.length == 1 && people[0]['@id'] == origin + baseurl + '/#person',
          "#{route}: shared Person identity missing/duplicated")
    check(schemas.none? { |node| node['@type'] == 'ProfilePage' },
          "#{route}: not a profile page")
    doc
  rescue JSON::ParserError
    raise Error, "#{route}: invalid JSON-LD"
  end

  def metadata(node, article)
    front = article.data
    check(node.css('time[data-published-on]').map { |item| item['datetime'] } ==
          [front['published_on']], "#{article.path}: publication date missing/mismatched")

    expected_update =
      if front['updated_on'] && front['updated_on'] != front['published_on']
        [front['updated_on']]
      else
        []
      end
    check(node.css('time[data-updated-on]').map { |item| item['datetime'] } == expected_update,
          "#{article.path}: update date missing/mismatched")
    check(node.css('[data-article-type]').map { |item| item['data-article-type'] } ==
          [front['article_type']], "#{article.path}: type missing/mismatched")
    check(node.css('[data-topic]').map { |item| item['data-topic'] } == front['topics'],
          "#{article.path}: topics missing/mismatched")
  end

  def safe_article_href?(href)
    value = href.to_s.strip
    return false if value.empty?
    return true if value.start_with?('#')
    return !value.start_with?('//') if value.start_with?('/')

    uri = URI.parse(value)
    return true if uri.scheme == 'mailto'

    uri.scheme == 'https' && !uri.host.to_s.empty? && uri.userinfo.nil?
  rescue URI::InvalidURIError
    false
  end

  def verify(source:, site:, as_of:, baseurl: '')
    require_nokogiri
    check(baseurl.empty? || /\A\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\z/.match?(baseurl),
          'baseurl: empty or safe path required')
    records = catalog(source, as_of: as_of)
    source = Pathname(source).expand_path
    site = Pathname(site).expand_path

    config = yaml((source / '_config.yml').read, 'site config')
    origin = config.fetch('url').sub(%r{/$}, '')

    shared_head = Nokogiri::HTML.fragment((source / '_includes/head-custom.html').read)
    expected_scripts = shared_head.css('script')
                                  .reject { |node| node['type'] == 'application/ld+json' }
                                  .map { |node| [node['src'], node.text.strip] }
    expected_scripts += %w[/assets/js/theme-toggle.js /assets/js/portfolio-rewrite.js]
                        .map { |path| [baseurl + path, ''] }

    index = document(site, '/writing',
                     origin: origin, baseurl: baseurl, expected_scripts: expected_scripts)

    cards = index.css('[data-writing-url]')
    expected = records.active.map { |article| article.data['permalink'] }
    check(cards.map { |node| node['data-writing-url'] } == expected,
          '/writing: discovery/order/uniqueness mismatch')
    check(index.css('#writing-latest [data-writing-url]').map { |node| node['data-writing-url'] } ==
          expected.take(1), '/writing: latest mismatch')
    check(index.css('#writing-more [data-writing-url]').map { |node| node['data-writing-url'] } ==
          expected.drop(1), '/writing: remainder mismatch')
    check(index.css('#writing-empty').length == (expected.empty? ? 1 : 0),
          '/writing: empty state mismatch')

    legacy = records.legacy.map { |article| article.data['permalink'] }
    check(index.css('[data-writing-legacy-url]').map { |node| node['data-writing-legacy-url'] } ==
          legacy, '/writing: legacy coverage mismatch')
    check(index.css('#writing-legacy time').empty?, '/writing: invented legacy date')

    cards.zip(records.active).each do |card, article|
      link = card.at_css('h3 a')
      check(link && link['href'] == baseurl + article.data['permalink'] &&
            link.text == article.data['title'], "#{article.path}: card link/title mismatch")
      check(card.css('h3 *').map(&:name) == ['a'],
            "#{article.path}: title markup was not escaped")
      check(card.at_css('p')&.text == article.data['description'],
            "#{article.path}: card description mismatch")
      metadata(card, article)
    end

    records.active.each do |article|
      route = article.data['permalink']
      page = document(site, route,
                      origin: origin, baseurl: baseurl, expected_scripts: expected_scripts)
      wrapper = page.at_css('article[data-writing-article]')
      check(wrapper, "#{article.path}: writing article wrapper missing")
      check(wrapper.at_css('h1')&.text == article.data['title'],
            "#{article.path}: article title mismatch")
      check(wrapper.at_css('.section-lead')&.text == article.data['description'],
            "#{article.path}: article description mismatch")
      body = wrapper.at_css('[data-writing-body]')
      check(body && !body.text.strip.empty?,
            "#{article.path}: rendered body missing")
      unsafe_links = body.css('a[href]').reject { |node| safe_article_href?(node['href']) }
      check(unsafe_links.empty?,
            "#{article.path}: unsafe rendered article link scheme")
      check(wrapper.at_css('a[data-writing-back]')&.[]('href') == baseurl + '/writing',
            "#{article.path}: writing back-link mismatch")
      metadata(wrapper, article)
    end

    records.legacy.each do |article|
      route = article.data['permalink']
      page = document(site, route,
                      origin: origin, baseurl: baseurl, expected_scripts: expected_scripts)
      check(page.at_css('h1')&.text == article.data['title'],
            "#{article.path}: legacy title mismatch")
    end

    records.drafts.each do |article|
      check(output(site, article.data['permalink']).nil?,
            "#{article.path}: unpublished route leaked into release build")
    end

    %w[AGENTS.md scripts docs worker vendor node_modules blog_automation].each do |private_entry|
      check(!(site / private_entry).exist?,
            "public build leaked private repository path: #{private_entry}")
    end

    records
  rescue Errno::ENOENT => e
    raise Error, "required rendered/source file missing: #{e.message}"
  end

  def default_as_of
    require 'tzinfo'
    TZInfo::Timezone.get('America/Chicago').to_local(Time.now.utc).to_date
  rescue LoadError => e
    raise Error, "default date requires TZInfo: #{e.message}"
  end

  def run_cli(argv)
    root = Pathname(__dir__).join('..').expand_path
    options = {
      source: root,
      site: root / '_site',
      as_of: nil,
      baseurl: '',
      source_only: false
    }

    parser = OptionParser.new do |opts|
      opts.banner = 'Usage: verify_writing.rb [options]'
      opts.on('--source PATH', 'Source root') { |value| options[:source] = Pathname(value) }
      opts.on('--site PATH', 'Rendered site root') { |value| options[:site] = Pathname(value) }
      opts.on('--as-of YYYY-MM-DD', 'Freeze validation date') do |value|
        options[:as_of] = Date.iso8601(value)
      rescue Date::Error
        raise OptionParser::InvalidArgument, 'invalid --as-of date'
      end
      opts.on('--baseurl PATH', 'Rendered baseurl') { |value| options[:baseurl] = value }
      opts.on('--source-only', 'Validate source metadata only') { options[:source_only] = true }
    end
    parser.parse!(argv)
    raise OptionParser::InvalidArgument, "unexpected arguments: #{argv.join(' ')}" unless argv.empty?

    as_of = options[:as_of] || default_as_of
    if options[:source_only]
      result = catalog(options[:source], as_of: as_of)
      puts "Writing source verification passed (#{result.active.length} public, " \
           "#{result.drafts.length} draft, #{result.legacy.length} legacy)."
    else
      result = verify(source: options[:source], site: options[:site],
                      as_of: as_of, baseurl: options[:baseurl])
      puts "Writing rendered verification passed (#{result.active.length} public, " \
           "#{result.drafts.length} draft, #{result.legacy.length} legacy)."
    end
    0
  rescue Error, OptionParser::ParseError => e
    warn "Writing verification failed: #{e.message}"
    1
  end
end

if $PROGRAM_NAME == __FILE__
  exit WritingContract.run_cli(ARGV)
end
