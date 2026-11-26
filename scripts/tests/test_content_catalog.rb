require 'minitest/autorun'
require 'yaml'
require_relative '../../_plugins/content_catalog'

class ContentCatalogTest < Minitest::Test
  def market_record(overrides = {})
    {
      'id' => 'market-systems',
      'canonical_url' => '/work/market-systems/',
      'kind' => 'project-family',
      'title' => 'Market systems',
      'summary' => 'A history of practical market research and decision tools.',
      'topics' => ['markets', 'mathematics'],
      'availability' => ['historical', 'public-source'],
      'source_refs' => ['https://github.com/ssmanji89'],
      'related_ids' => [],
      'authored_fields' => []
    }.merge(overrides)
  end

  def validation_errors(records, relations = [], topics: %w[markets mathematics])
    Sulemanji::ContentCatalog.validate(
      records: records,
      relations: relations,
      topics: topics,
      known_urls: ['/work/market-systems/', '/notes/current-article']
    )
  end

  def test_valid_independent_subject
    assert_empty validation_errors([market_record])
  end

  def test_unknown_topic_is_rejected_with_record_id
    errors = validation_errors([market_record('topics' => ['made-up-topic'])])
    assert errors.any? { |error| error.include?('market-systems') && error.include?('made-up-topic') }
  end

  def test_dangling_relation_is_rejected
    relation = {
      'from_id' => 'market-systems', 'to_id' => 'missing-item',
      'relation' => 'continuation', 'reason' => 'Continue the research.'
    }
    assert validation_errors([market_record], [relation]).any? { |error| error.include?('missing-item') }
  end

  def test_private_url_is_rejected
    errors = validation_errors([market_record('source_refs' => ['http://127.0.0.1/private'])])
    assert errors.any? { |error| error.match?(/public|https|url/i) }
  end

  def test_article_dates_and_routes_remain_authoritative
    annotation = market_record(
      'canonical_url' => '/notes/current-article',
      'authored_fields' => {'published_on' => '2030-01-01', 'permalink' => '/changed-route'}
    )
    errors = validation_errors([annotation])
    assert errors.any? { |error| error.match?(/published_on|permalink|authoritative/i) }
  end

  def test_topic_pages_require_real_items
    topics = {'markets' => 'Markets', 'empty' => 'Empty'}
    items = [{'id' => 'market-systems', 'topics' => ['markets']}]
    assert_equal({'markets' => 'Markets'}, Sulemanji::ContentCatalog.topics_with_items(topics: topics, items: items))
  end

  def test_noncommercial_relation_has_no_business_cta
    relation = YAML.safe_load(File.read(File.join(__dir__, '../../_data/content-relations.yml'))).find do |item|
      item['from_id'] == 'independent-interests' && item['to_id'] == 'mathematical-verification'
    end
    assert_equal 'These are separate examples of curiosity pursued through observation and careful checking.', relation['reason']
    include_text = File.read(File.join(__dir__, '../../_includes/article-context.html'))
    refute_includes include_text, 'data-article-context-cta'
  end
end
