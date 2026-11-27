require 'minitest/autorun'
require 'yaml'
require_relative '../../_plugins/content_formats'
require_relative '../../_plugins/content_catalog'

class ContentFormatsTest < Minitest::Test
  def cases
    YAML.safe_load(File.read(File.join(__dir__, '../../_data/work-cases.yml')), aliases: false)
  end

  def test_each_figure_requires_a_text_equivalent
    market = cases.find { |item| item['slug'] == 'market-systems' }
    assert_empty Sulemanji::ContentFormats.validate_figure(market)
    assert_includes Sulemanji::ContentFormats.validate_figure(market.reject { |key, _| key == 'diagram_text_equivalent' }),
      'market-systems: diagram_text_equivalent required'
  end

  def test_untrusted_figure_markup_and_non_https_source_are_rejected
    unsafe = cases.find { |item| item['slug'] == 'market-systems' }.merge(
      'diagram' => '<svg onload=alert(1)>',
      'sources' => [{'href' => 'http://127.0.0.1/private'}]
    )
    errors = Sulemanji::ContentFormats.validate_figure(unsafe)
    assert errors.any? { |error| error.include?('invalid diagram asset') }
    assert errors.any? { |error| error.include?('public HTTPS') }
  end

  def test_historical_project_states_remain_explicit
    market = cases.find { |item| item['slug'] == 'market-systems' }
    states = market.fetch('projects').map { |project| project.fetch('state') }.join(' ')
    assert_includes states.downcase, 'historical'
    assert_includes states, 'Private source'
  end

  def test_authored_article_route_and_date_cannot_be_overridden
    item = {
      'id' => 'source-article', 'canonical_url' => '/notes/source-article', 'kind' => 'field-note',
      'title' => 'Source article', 'summary' => 'A source article.', 'topics' => ['markets'],
      'availability' => ['historical'], 'source_refs' => [], 'related_ids' => [],
      'authored_fields' => {'published_on' => '2030-01-01', 'permalink' => '/replacement'}
    }
    errors = Sulemanji::ContentCatalog.validate(records: [item], relations: [], topics: ['markets'], known_urls: ['/notes/source-article'])
    assert errors.any? { |error| error.include?('published_on and permalink remain authoritative') }
  end
end
