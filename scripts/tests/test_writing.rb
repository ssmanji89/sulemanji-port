require 'date'
require 'digest'
require 'fileutils'
require 'minitest/autorun'
require 'nokogiri'
require 'tmpdir'
require 'jekyll'
require_relative '../verify_writing'

class WritingTest < Minitest::Test
  REPO = File.expand_path('../..', __dir__)
  AS_OF = Date.new(2026, 9, 10)

  def setup
    @tmp = Dir.mktmpdir('writing-test-')
    @source = File.join(@tmp, 'source')
    @site = File.join(@tmp, 'site')
    FileUtils.mkdir_p(File.join(@source, 'notes'))
    %w[_config.yml writing.md _layouts _includes _data _plugins].each do |entry|
      FileUtils.cp_r(File.join(REPO, entry), File.join(@source, entry))
    end
    FileUtils.mkdir_p(File.join(@source, 'scripts'))
    FileUtils.cp(
      File.join(REPO, 'scripts/verify_writing.rb'),
      File.join(@source, 'scripts/verify_writing.rb')
    )
    File.write(
      File.join(@source, '_data/article-context.yml'),
      {'version' => 1, 'routes' => {}}.to_yaml
    )
    disclosure = File.join(REPO, 'affiliate-disclosure.md')
    FileUtils.cp(disclosure, @source) if File.exist?(disclosure)
    FileUtils.cp(
      File.join(REPO, 'notes/agent-safety-from-incidents.md'),
      File.join(@source, 'notes/agent-safety-from-incidents.md')
    )
    @registry = WritingContract.yaml(
      File.read(File.join(@source, '_data/writing.yml')),
      'registry'
    )
    save_registry
  end

  def teardown
    FileUtils.remove_entry(@tmp) if @tmp && File.exist?(@tmp)
  end

  def save_registry
    File.write(File.join(@source, '_data/writing.yml'), @registry.to_yaml)
  end

  def commercial_registry
    path = File.join(@source, '_data/commercial-links.yml')
    return {
      'version' => 1,
      'suspicious_query_keys' => %w[tag ref referral affiliate aff],
      'programs' => {}
    } unless File.exist?(path)

    WritingContract.yaml(
      File.read(path),
      'commercial link registry'
    )
  end

  def save_commercial_registry(data)
    File.write(File.join(@source, '_data/commercial-links.yml'), data.to_yaml)
  end

  def reset_notes
    notes = File.join(@source, 'notes')
    FileUtils.rm_rf(notes)
    FileUtils.mkdir_p(notes)
    FileUtils.cp(
      File.join(REPO, 'notes/agent-safety-from-incidents.md'),
      File.join(notes, 'agent-safety-from-incidents.md')
    )
  end

  def note(slug, overrides = {}, body: "## A synthetic test\n\nThis fixture tests rendering, not an actual engagement.\n")
    data = {
      'writing_schema' => 1,
      'layout' => 'writing-article',
      'title' => "Test #{slug}",
      'description' => "Synthetic description #{slug}.",
      'permalink' => "/notes/#{slug}",
      'published' => true,
      'published_on' => '2026-09-09',
      'article_type' => 'analysis',
      'time_horizon' => 'durable',
      'reader' => 'msp-engineer',
      'topics' => ['microsoft-365']
    }.merge(overrides)
    path = File.join(@source, "notes/#{slug}.md")
    File.write(path, data.to_yaml + "---\n\n" + body)
    if data['writing_schema'] == 1 && @registry.key?('schema_v1_sha256')
      @registry['schema_v1_sha256']["notes/#{slug}.md"] = Digest::SHA256.file(path).hexdigest
      save_registry
    end
    path
  end

  def publication_note(slug, overrides = {}, body: "## A synthetic Publication\n\nThis fixture tests schema-v2 behavior.\n")
    data = {
      'writing_schema' => 2,
      'layout' => 'writing-article',
      'title' => "Test #{slug}",
      'description' => "Synthetic description #{slug}.",
      'permalink' => "/notes/#{slug}",
      'published' => true,
      'published_on' => '2026-09-09',
      'publication_family' => 'professional-analysis',
      'commercial_intent' => 'none',
      'disclosure_required' => false,
      'time_horizon' => 'durable',
      'reader' => 'msp-engineer',
      'topics' => ['microsoft-365']
    }.merge(overrides)
    path = File.join(@source, "notes/#{slug}.md")
    File.write(path, data.to_yaml + "---\n\n" + body)
    path
  end

  def build(unpublished: false, baseurl: '')
    FileUtils.rm_rf(@site)
    config = Jekyll.configuration(
      'config' => File.join(@source, '_config.yml'),
      'source' => @source,
      'destination' => @site,
      'quiet' => true,
      'unpublished' => unpublished,
      'baseurl' => baseurl,
      'incremental' => false,
      'future' => false
    )
    # Jekyll 3.9 prefers layouts in the current directory over source layouts.
    Dir.chdir(@source) { Jekyll::Site.new(config).process }
  end

  def catalog
    WritingContract.catalog(@source, as_of: AS_OF)
  end

  def verify(baseurl: '')
    WritingContract.verify(
      source: @source,
      site: @site,
      as_of: AS_OF,
      baseurl: baseurl
    )
  end

  def html(route)
    Nokogiri::HTML(WritingContract.output(@site, route).read)
  end

  def test_fixture_build_uses_its_own_layouts_outside_the_source_directory
    note('fixture')
    Dir.chdir(REPO) { build }

    assert_equal 'Test fixture', html('/notes/fixture').at_css('h1')&.text
    assert_includes html('/notes/fixture').at_css('[data-writing-body]')&.text.to_s,
                    'This fixture tests rendering, not an actual engagement.'
    assert_equal 'Writing on work and beyond.', html('/writing').at_css('h1')&.text
    assert_includes html('/writing').text, 'interests beyond work'
    assert_includes html('/writing').text, 'Paid links are disclosed when they appear.'
  end

  def test_unchanged_schema_v1_uses_compatibility_defaults
    note('v1-compatible')

    article = catalog.active.find { |item| item.path == 'notes/v1-compatible.md' }

    assert_equal 'professional-analysis', article.data['publication_family']
    assert_equal 'none', article.data['commercial_intent']
    assert_equal false, article.data['disclosure_required']
  end

  def test_changed_schema_v1_digest_requires_schema_v2
    path = note('v1-frozen')
    File.write(path, File.read(path) + "\n")

    error = assert_raises(WritingContract::Error) { catalog }
    assert_match(/schema-v1 source changed; migrate to writing_schema 2/, error.message)
  end

  def test_schema_v2_requires_publication_fields
    publication_note('valid-v2')
    article = catalog.active.find { |item| item.path == 'notes/valid-v2.md' }
    assert_equal 'professional-analysis', article.data['publication_family']
    assert_equal 'none', article.data['commercial_intent']
    assert_equal false, article.data['disclosure_required']

    invalid = [
      {'publication_family' => nil},
      {'publication_family' => 'unknown'},
      {'commercial_intent' => nil},
      {'commercial_intent' => 'unknown'},
      {'disclosure_required' => nil},
      {'disclosure_required' => 'false'}
    ]
    invalid.each_with_index do |override, index|
      reset_notes
      publication_note('invalid-v2', override)
      assert_raises(WritingContract::Error, "#{index}: #{override.inspect}") { catalog }
    end
  end

  def test_optional_social_image_metadata_is_strict
    publication_note(
      'bad-social-image',
      {
        'published' => false,
        'published_on' => nil,
        'social_image' => {
          'path' => '/../private.png',
          'alt' => '<script>',
          'width' => 600,
          'height' => 315
        }
      }
    )

    error = assert_raises(WritingContract::Error) { catalog }
    assert_match(/invalid social_image path/, error.message)
  end

  def test_commercial_intent_matrix_accepts_only_matching_relationships
    referral_registry = commercial_registry
    referral_registry['programs']['fixture-referral'] = {
      'intent' => 'referral',
      'hosts' => ['referral.example'],
      'include_subdomains' => false,
      'required_query' => 'ref',
      'disclosure' => 'This article contains affiliate or referral links. I may earn a commission if you buy or sign up through them.'
    }
    referral_registry['programs']['fixture-owned-offer'] = {
      'intent' => 'own-product',
      'hosts' => ['sulemanji.com'],
      'include_subdomains' => true,
      'root_paths' => ['/products/fixture'],
      'disclosure' => 'I created and sell'
    }
    save_commercial_registry(referral_registry)

    cases = [
      ['none', false, "## Independent analysis\n\nNo commercial relationship applies.\n"],
      ['affiliate', true, "## Affiliate\n\nAs an Amazon Associate I earn from qualifying purchases.\n\n[Product](https://www.amazon.com/dp/B0H4X4X468?tag=sullymanji-20)\n"],
      ['referral', true, "## Referral\n\nThis article contains affiliate or referral links. I may earn a commission if you buy or sign up through them.\n\n[Service](https://referral.example/start?ref=suleman)\n"],
      ['sponsorship', true, "## Sponsored\n\nSponsor: Acme paid for this article.\n"],
      ['paid-recommendation', true, "## Recommendation\n\nPaid recommendation: Acme paid me to include this recommendation.\n"],
      ['own-product', true, "## My product\n\nI created and sell this product.\n\n[See it](/products/fixture)\n"],
      ['mixed', true, "## Mixed\n\nAs an Amazon Associate I earn from qualifying purchases.\n\nSponsor: Acme paid for this article.\n\n[Product](https://amazon.com/dp/B0H4X4X468?tag=sullymanji-20)\n"]
    ]

    cases.each_with_index do |(intent, required, body), index|
      reset_notes
      publication_note(
        "commercial-#{index}",
        {'commercial_intent' => intent, 'disclosure_required' => required},
        body: body
      )
      catalog
    end
  end

  def test_commercial_source_rejects_mismatches_and_missing_disclosures
    invalid = [
      [
        {'commercial_intent' => 'none', 'disclosure_required' => false},
        "## Hidden affiliate\n\n[Product](https://amazon.com/dp/B0H4X4X468?tag=sullymanji-20)\n"
      ],
      [
        {'commercial_intent' => 'affiliate', 'disclosure_required' => false},
        "## Affiliate\n\nAs an Amazon Associate I earn from qualifying purchases.\n\n[Product](https://amazon.com/dp/B0H4X4X468?tag=sullymanji-20)\n"
      ],
      [
        {'commercial_intent' => 'affiliate', 'disclosure_required' => true},
        "## Missing disclosure\n\n[Product](https://amazon.com/dp/B0H4X4X468?tag=sullymanji-20)\n"
      ],
      [
        {'commercial_intent' => 'affiliate', 'disclosure_required' => true},
        "## Unknown program\n\n[Product](https://merchant.example/item?tag=sullymanji-20)\n"
      ],
      [
        {'commercial_intent' => 'sponsorship', 'disclosure_required' => true},
        "## Anonymous sponsor\n\nThis article was sponsored.\n"
      ],
      [
        {'commercial_intent' => 'paid-recommendation', 'disclosure_required' => true},
        "## Anonymous recommendation\n\nThis is a paid recommendation.\n"
      ],
      [
        {'commercial_intent' => 'own-product', 'disclosure_required' => true},
        "## Product\n\n[See the offer](/work-with-me)\n"
      ],
      [
        {'commercial_intent' => 'mixed', 'disclosure_required' => true},
        "## Only one relationship\n\nAs an Amazon Associate I earn from qualifying purchases.\n\n[Product](https://amazon.com/dp/B0H4X4X468?tag=sullymanji-20)\n"
      ]
    ]

    invalid.each_with_index do |(front, body), index|
      reset_notes
      publication_note("invalid-commercial-#{index}", front, body: body)
      assert_raises(WritingContract::Error, index.to_s) { catalog }
    end
  end

  def test_affiliate_link_classifier_requires_configured_host_and_query
    assert_respond_to WritingContract, :commercial_registry
    assert_respond_to WritingContract, :classify_commercial_href
    registry = WritingContract.commercial_registry(@source)

    amazon = WritingContract.classify_commercial_href(
      'https://www.amazon.com/dp/B0H4X4X468?tag=sullymanji-20',
      registry
    )
    encoded = WritingContract.classify_commercial_href(
      'https://AMAZON.COM/dp/B0H4X4X468?tag=sullymanji%2D20',
      registry
    )
    unknown = WritingContract.classify_commercial_href(
      'https://merchant.example/item?tag=sullymanji-20',
      registry
    )

    assert_equal 'amazon', amazon['program']
    assert_equal 'affiliate', encoded['intent']
    assert_equal 'unknown', unknown['program']
    assert_nil WritingContract.classify_commercial_href(
      'https://www.amazon.com/dp/B0H4X4X468',
      registry
    )
    assert_equal 'unknown', WritingContract.classify_commercial_href(
      'https://amzn.to/fixture',
      registry
    )['program']
    assert_nil WritingContract.classify_commercial_href(
      '/work-with-me#professional-conversations',
      registry
    )
  end

  def test_hidden_sponsorship_disclosure_is_rejected
    publication_note(
      'hidden-sponsor',
      {'commercial_intent' => 'sponsorship', 'disclosure_required' => true},
      body: "## Sponsored\n\n[Details](https://example.com \"Sponsor: Acme paid for this article.\")\n"
    )

    error = assert_raises(WritingContract::Error) { catalog }
    assert_match(/named sponsor disclosure required/, error.message)
  end

  def test_schema_v2_article_renders_once_in_writing_index_with_markdown_image
    publication_note(
      'publication-v2',
      {},
      body: "## Useful view\n\n![Evidence diagram](https://images.example/evidence.png)\n"
    )

    build
    verify

    assert_equal ['/notes/publication-v2'],
                 html('/writing').css('[data-writing-url="/notes/publication-v2"]')
                                 .map { |node| node['data-writing-url'] }
    article = html('/notes/publication-v2')
    assert_equal ['professional-analysis'],
                 article.css('[data-publication-family]')
                        .map { |node| node['data-publication-family'] }
    assert_equal ['https://images.example/evidence.png'],
                 article.css('[data-writing-body] img').map { |node| node['src'] }
  end

  def test_commercial_disclosure_must_precede_first_link
    publication_note(
      'late-disclosure',
      {'commercial_intent' => 'affiliate', 'disclosure_required' => true},
      body: "## Product\n\n[Product](https://amazon.com/dp/B0H4X4X468?tag=sullymanji-20)\n\nAs an Amazon Associate I earn from qualifying purchases.\n"
    )
    build

    error = assert_raises(WritingContract::Error) { verify }
    assert_match(/disclosure must precede first commercial link/, error.message)
  end

  def test_commercial_disclosure_must_be_complete_before_link_paragraph
    publication_note(
      'same-paragraph-disclosure',
      {'commercial_intent' => 'affiliate', 'disclosure_required' => true},
      body: "## Product\n\n[Product](https://amazon.com/dp/B0H4X4X468?tag=sullymanji-20) As an Amazon Associate I earn from qualifying purchases.\n"
    )
    build

    error = assert_raises(WritingContract::Error) { verify }
    assert_match(/disclosure must precede first commercial link/, error.message)
  end

  def test_sponsorship_disclosure_must_lead_visible_promotional_copy
    publication_note(
      'late-sponsor',
      {'commercial_intent' => 'sponsorship', 'disclosure_required' => true},
      body: "## Sponsored\n\nAcme makes the best fixture for this workflow.\n\nSponsor: Acme paid for this article.\n"
    )
    build

    error = assert_raises(WritingContract::Error) { verify }
    assert_match(/commercial disclosure must lead article body/, error.message)
  end

  def test_affiliate_disclosure_page_contains_exact_amazon_statement
    build

    path = WritingContract.output(@site, '/affiliate-disclosure')
    assert path, 'affiliate disclosure route must render'
    assert_includes Nokogiri::HTML(path.read).text,
                    'As an Amazon Associate I earn from qualifying purchases.'
  end

  def test_publication_jsonld_matches_visible_content
    publication_note('jsonld-v2', {'updated_on' => '2026-09-10'})
    build
    verify

    nodes = html('/notes/jsonld-v2').css('script[type="application/ld+json"]').flat_map do |script|
      WritingContract.nodes(JSON.parse(script.text))
    end
    article = nodes.find { |node| node['@type'] == 'Article' }

    assert article, 'one Article JSON-LD node required'
    assert_equal 'Test jsonld-v2', article['headline']
    assert_equal 'Synthetic description jsonld-v2.', article['description']
    assert_equal 'https://www.sulemanji.com/notes/jsonld-v2', article['url']
    assert_equal '2026-09-09', article['datePublished']
    assert_equal '2026-09-10', article['dateModified']
    assert_equal({'@id' => 'https://www.sulemanji.com/#person'}, article['author'])
    assert_empty nodes.select { |node| %w[Review Product].include?(node['@type']) }
  end

  def test_public_article_presentation_and_paid_link_contract
    context = {
      'version' => 1,
      'routes' => {
        '/notes/presentation' => {
          'proof_url' => '/case-studies/agentic-msp-delivery',
          'proof_label' => 'MSP service delivery using agentic LLMs',
          'proof_status' => 'case study',
          'cta_label' => 'Discuss a business engagement'
        }
      }
    }
    File.write(File.join(@source, '_data/article-context.yml'), context.to_yaml)
    paid = 'https://amazon.com/dp/B0H4X4X468?tag=sullymanji-20'
    publication_note(
      'presentation',
      {'commercial_intent' => 'affiliate', 'disclosure_required' => true},
      body: "## Product\n\nAs an Amazon Associate I earn from qualifying purchases.\n\n[First](#{paid})\n\n[Second](#{paid})\n"
    )
    publication_note('unlisted')

    build
    page = html('/notes/presentation')

    assert_equal '/about', page.at_css('[data-writing-author-name]')['href']
    assert_equal 'article', page.at_css('meta[property="og:type"]')['content']
    assert_equal 'summary_large_image', page.at_css('meta[name="twitter:card"]')['content']
    assert_equal page.at_css('meta[property="og:image"]')['content'],
                 page.at_css('meta[property="twitter:image"]')['content']
    assert_equal 'Social card for "Test presentation" by Suleman Manji',
                 page.at_css('meta[property="og:image:alt"]')['content']
    assert page.css("a[href='#{paid}']").all? do |link|
      link['rel'].split.sort == ['nofollow', 'sponsored']
    end
    preserved = WritingDiscovery.qualify_commercial_links(
      %(<a href="#{paid}" rel="noopener">Product</a>),
      WritingContract.commercial_registry(@source)
    )
    assert_equal ['nofollow', 'noopener', 'sponsored'],
                 Nokogiri::HTML.fragment(preserved).at_css('a')['rel'].split.sort
    assert_equal 1, page.css('[data-article-context]').length
    assert_includes page.at_css('[data-article-context]').text,
                    'Business delivery is through Viyu Network Solutions.'
    assert_empty html('/notes/unlisted').css('[data-article-context]')
  end

  def test_publication_jsonld_mutations_fail_release_verification
    publication_note('jsonld-mutated', {'updated_on' => '2026-09-10'})
    build
    path = WritingContract.output(@site, '/notes/jsonld-mutated')
    original = path.read

    mutations = {
      missing: lambda do |doc|
        doc.css('script[type="application/ld+json"]').find do |script|
          WritingContract.nodes(JSON.parse(script.text)).any? { |node| node['@type'] == 'Article' }
        end.remove
      end,
      duplicate: lambda do |doc|
        script = doc.css('script[type="application/ld+json"]').find do |candidate|
          WritingContract.nodes(JSON.parse(candidate.text)).any? { |node| node['@type'] == 'Article' }
        end
        script.add_next_sibling(script.dup)
      end,
      mismatched_headline: lambda do |doc|
        script = doc.css('script[type="application/ld+json"]').find do |candidate|
          WritingContract.nodes(JSON.parse(candidate.text)).any? { |node| node['@type'] == 'Article' }
        end
        data = JSON.parse(script.text)
        data['headline'] = 'Wrong title'
        script.content = JSON.generate(data)
      end
    }

    mutations.each do |name, mutate|
      doc = Nokogiri::HTML(original)
      mutate.call(doc)
      File.write(path, doc.to_html)
      assert_raises(WritingContract::Error, name.to_s) { verify }
    end
  ensure
    File.write(path, original) if path && original
  end

  def test_empty_index_has_no_feature_or_false_publication
    build
    verify
    assert_equal 1, html('/writing').css('#writing-empty').length
    assert_empty html('/writing').css('#writing-latest, #writing-more')
    assert_equal 1, html('/writing').css('#writing-legacy').length
  end

  def test_one_article_is_featured_exactly_once
    note('one')
    build
    verify
    assert_equal ['/notes/one'],
                 html('/writing').css('[data-writing-url]').map { |node| node['data-writing-url'] }
    assert_empty html('/writing').css('#writing-more')
  end

  def test_order_is_publication_desc_then_permalink_asc_not_update_date
    note('zeta', {'published_on' => '2026-09-10'})
    note('alpha', {'published_on' => '2026-09-10'})
    note('older', {'published_on' => '2026-09-01', 'updated_on' => '2026-09-10'})
    build
    verify
    assert_equal %w[/notes/alpha /notes/zeta /notes/older],
                 html('/writing').css('[data-writing-url]').map { |node| node['data-writing-url'] }
    assert_equal ['2026-09-10'],
                 html('/notes/older').css('time[data-updated-on]').map { |node| node['datetime'] }
  end

  def test_unpublished_is_absent_from_index_and_direct_route
    note('draft', {'published' => false, 'published_on' => nil})
    build
    verify
    assert_nil WritingContract.output(@site, '/notes/draft')
    refute_includes html('/writing').text, 'Test draft'
  end

  def test_unpublished_preview_cannot_pass_release_check
    note('draft', {'published' => false, 'published_on' => nil})
    build(unpublished: true)
    error = assert_raises(WritingContract::Error) { verify }
    assert_match(/unpublished route leaked/, error.message)
  end

  def test_legacy_url_is_preserved_without_fabricated_date_or_review
    relative = 'notes/agent-safety-from-incidents.md'
    before = File.binread(File.join(@source, relative))
    build
    verify
    assert_equal ['/notes/agent-safety'],
                 html('/writing').css('[data-writing-legacy-url]').map { |node| node['data-writing-legacy-url'] }
    assert_empty html('/writing').css('#writing-latest, #writing-legacy time')
    assert_equal 'A write is a claim, not evidence', html('/notes/agent-safety').at_css('h1').text
    assert_equal before, File.binread(File.join(@source, relative))
    page = html('/notes/agent-safety')
    assert_equal '/about', page.at_css('[data-writing-author-name]')['href']
    nodes = page.css('script[type="application/ld+json"]').flat_map do |script|
      WritingContract.nodes(JSON.parse(script.text))
    end
    article = nodes.find { |node| %w[Article BlogPosting].include?(node['@type']) }
    assert article
    refute article.key?('datePublished')
    refute article.key?('dateModified')
    refute_includes html('/writing').text.downcase, 'source reviewed'
  end

  def test_missing_legacy_rendered_route_fails_release_check
    build
    verify

    WritingContract.output(@site, '/notes/agent-safety').delete
    error = assert_raises(WritingContract::Error) { verify }
    assert_match(%r{/notes/agent-safety: rendered route missing}, error.message)
  end

  def test_registry_requires_canonical_legacy_entry_even_when_source_is_deleted
    @registry['legacy_paths'] = []
    save_registry
    File.delete(File.join(@source, 'notes/agent-safety-from-incidents.md'))

    error = assert_raises(WritingContract::Error) { catalog }
    assert_match(/canonical legacy path required/, error.message)
  end

  def test_legacy_permalink_is_pinned_to_canonical_route
    path = File.join(@source, 'notes/agent-safety-from-incidents.md')
    File.write(path, File.read(path).sub('permalink: /notes/agent-safety',
                                        'permalink: /notes/moved'))

    error = assert_raises(WritingContract::Error) { catalog }
    assert_match(/canonical legacy permalink required/, error.message)
  end

  def test_schema_and_field_errors_fail_before_build
    invalid = [
      {'writing_schema' => nil},
      {'writing_schema' => '1'},
      {'writing_schema' => 2},
      {'published' => 'false'},
      {'published' => '2026-09-10'},
      {'published_on' => nil},
      {'published_on' => '2026-02-30'},
      {'published_on' => Date.new(2026, 9, 9)},
      {'published_on' => '2026-09-11'},
      {'updated_on' => '2026-09-08'},
      {'updated_on' => '2026-09-11'},
      {'layout' => 'default'},
      {'permalink' => '/notes/wrong'},
      {'article_type' => 'unknown'},
      {'time_horizon' => 'unknown'},
      {'reader' => 'unknown'},
      {'topics' => []},
      {'topics' => ['microsoft-365', 'microsoft-365']},
      {'topics' => ['unknown']},
      {'extra' => 'nope'}
    ]
    invalid.each_with_index do |override, index|
      reset_notes
      note('bad', override)
      assert_raises(WritingContract::Error, "#{index}: #{override.inspect}") { catalog }
    end
  end

  def test_duplicate_yaml_keys_and_aliases_fail
    path = note('bad')
    original = File.read(path)
    File.write(path, original.sub("published: true", "published: true\npublished: false"))
    assert_raises(WritingContract::Error) { catalog }

    File.write(
      path,
      original.sub('Test bad', '&label Test bad')
              .sub('Synthetic description bad.', '*label')
    )
    assert_raises(WritingContract::Error) { catalog }
  end

  def test_unknown_legacy_or_unstructured_file_is_not_silently_ignored
    File.write(File.join(@source, 'notes/new.md'), "# Missing metadata\n")
    assert_raises(WritingContract::Error) { catalog }
  end

  def test_registry_cannot_exempt_a_new_note_as_legacy
    @registry['legacy_paths'] = ['notes/new.md']
    save_registry
    note('new')

    error = assert_raises(WritingContract::Error) { catalog }
    assert_match(/unrecognized legacy path/, error.message)
  end

  def test_nested_and_symlinked_articles_fail
    path = note('nested')
    FileUtils.mkdir_p(File.join(@source, 'notes/sub'))
    FileUtils.mv(path, File.join(@source, 'notes/sub/nested.md'))
    assert_raises(WritingContract::Error) { catalog }

    FileUtils.rm_rf(File.join(@source, 'notes/sub'))
    File.symlink(File.join(@source, 'writing.md'), File.join(@source, 'notes/link.md'))
    assert_raises(WritingContract::Error) { catalog }
  end

  def test_legacy_and_new_permalink_collision_fails
    note('agent-safety')
    assert_raises(WritingContract::Error) { catalog }
  end

  def test_front_matter_text_is_escaped_not_executed
    title = 'R&D: "one" & two'
    note('escape', {'title' => title, 'description' => 'Facts & practical decisions.'})
    build
    verify
    assert_empty html('/writing').css('[data-probe]')
    assert_equal title, html('/notes/escape').at_css('h1').text
    assert_empty html('/notes/escape').at_css('h1').element_children
  end

  def test_baseurl_is_applied_once_to_links_and_canonical
    note('prefix')
    build(baseurl: '/preview')
    verify(baseurl: '/preview')
    assert_equal '/preview/notes/prefix',
                 html('/writing').at_css('[data-writing-url] h3 a')['href']
    assert_equal '/preview/writing',
                 html('/notes/prefix').at_css('[data-writing-back]')['href']
  end

  def test_article_liquid_and_duplicate_h1_do_not_pass
    note('template', body: "{{ site.data.writing }}")
    assert_raises(WritingContract::Error) { catalog }

    reset_notes
    note('template', body: "# Duplicate heading\n\nSynthetic text.")
    error = assert_raises(Jekyll::Errors::FatalException) { build }
    assert_match(/article body must begin below H1/, error.message)
  end

  def test_setext_and_indented_atx_h1_fail_source_gate
    note(
      'setext-h1',
      {'published' => false, 'published_on' => nil},
      body: "Heading\n=======\n\nSynthetic text.\n"
    )
    error = assert_raises(WritingContract::Error) { catalog }
    assert_match(/article body must begin below H1/, error.message)

    reset_notes
    note(
      'indented-h1',
      {'published' => false, 'published_on' => nil},
      body: "  # Heading\n\nSynthetic text.\n"
    )
    error = assert_raises(WritingContract::Error) { catalog }
    assert_match(/article body must begin below H1/, error.message)
  end

  def test_every_parser_recognized_article_body_h1_fails_source_gate
    h1_bodies = {
      'top-level ATX' => "# Heading\n\nSynthetic text.\n",
      'indented ATX' => "  # Heading\n\nSynthetic text.\n",
      'top-level Setext' => "Heading\n=======\n\nSynthetic text.\n",
      'blockquote ATX' => "> # Heading\n",
      'unordered-list ATX' => "- # Heading\n",
      'ordered-list ATX' => "1. # Heading\n",
      'nested container ATX' => "> - # Heading\n",
      'blockquote Setext' => "> Heading\n> =======\n",
      'unordered-list Setext' => "- Heading\n  =======\n",
      'nested container Setext' => "> - Heading\n>   =======\n"
    }

    h1_bodies.each do |name, body|
      reset_notes
      note('container-h1', {'published' => false, 'published_on' => nil}, body: body)

      error = assert_raises(WritingContract::Error, name) { catalog }
      assert_match(/article body must begin below H1/, error.message, name)
    end
  end

  def test_raw_html_in_article_body_fails_source_gate
    note(
      'unsafe-html',
      body: "## Unsafe markup\n\n<img src=x onerror=\"alert(document.domain)\">\n"
    )

    error = assert_raises(WritingContract::Error) { catalog }
    assert_match(/raw HTML forbidden in article body/, error.message)
  end

  def test_kramdown_attribute_lists_fail_source_gate
    note(
      'unsafe-attributes',
      body: "## Unsafe attributes\n\n[safe](https://example.com){: onclick=\"alert(document.domain)\"}\n"
    )

    error = assert_raises(WritingContract::Error) { catalog }
    assert_match(/Kramdown attribute lists forbidden in article body/, error.message)
  end

  def test_unsafe_rendered_article_link_scheme_fails_release_check
    note(
      'unsafe-link',
      body: "## Unsafe link\n\n[source](javascript:alert(document.domain))\n"
    )
    build

    error = assert_raises(WritingContract::Error) { verify }
    assert_match(/unsafe rendered article link scheme/, error.message)
  end

  def test_root_relative_article_links_reject_backslashes
    assert WritingContract.safe_article_href?('/notes/safe')
    refute WritingContract.safe_article_href?('/\\evil.example')
  end

  def test_root_relative_article_links_reject_ascii_controls
    assert WritingContract.safe_article_href?('/notes/safe')
    [
      "/\t/evil.example",
      "/\r/evil.example",
      "/\n/evil.example",
      "/notes/safe\t",
      "\n/notes/safe"
    ].each do |href|
      refute WritingContract.safe_article_href?(href), href.inspect
    end
  end

  def test_wrong_order_and_missing_route_are_detected_from_real_html
    note('alpha')
    note('beta')
    build
    verify

    file = WritingContract.output(@site, '/writing')
    original = file.read
    file.write(original.sub('data-writing-url="/notes/alpha"', 'data-writing-url="/notes/zzz"'))
    assert_raises(WritingContract::Error) { verify }

    file.write(original)
    WritingContract.output(@site, '/notes/alpha').delete
    assert_raises(WritingContract::Error) { verify }
  end

  def test_built_private_directories_fail_release_check
    build
    FileUtils.mkdir_p(File.join(@site, 'scripts'))
    assert_raises(WritingContract::Error) { verify }
  end
end
