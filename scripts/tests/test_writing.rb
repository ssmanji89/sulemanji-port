require 'date'
require 'fileutils'
require 'minitest/autorun'
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
    %w[_config.yml writing.md _layouts _includes _data].each do |entry|
      FileUtils.cp_r(File.join(REPO, entry), File.join(@source, entry))
    end
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
    Jekyll::Site.new(config).process
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
    note('zeta', 'published_on' => '2026-09-10')
    note('alpha', 'published_on' => '2026-09-10')
    note('older', 'published_on' => '2026-09-01', 'updated_on' => '2026-09-10')
    build
    verify
    assert_equal %w[/notes/alpha /notes/zeta /notes/older],
                 html('/writing').css('[data-writing-url]').map { |node| node['data-writing-url'] }
    assert_equal ['2026-09-10'],
                 html('/notes/older').css('time[data-updated-on]').map { |node| node['datetime'] }
  end

  def test_unpublished_is_absent_from_index_and_direct_route
    note('draft', 'published' => false, 'published_on' => nil)
    build
    verify
    assert_nil WritingContract.output(@site, '/notes/draft')
    refute_includes html('/writing').text, 'Test draft'
  end

  def test_unpublished_preview_cannot_pass_release_check
    note('draft', 'published' => false, 'published_on' => nil)
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
    note('escape', 'title' => title, 'description' => 'Facts & practical decisions.')
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
    build
    assert_raises(WritingContract::Error) { verify }
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
    ["/\t/evil.example", "/\r/evil.example", "/\n/evil.example"].each do |href|
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
