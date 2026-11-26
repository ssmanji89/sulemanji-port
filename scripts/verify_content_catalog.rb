#!/usr/bin/env ruby
require 'yaml'
require 'pathname'
require_relative '../_plugins/content_catalog'
require_relative 'verify_writing'

source = File.expand_path('..', __dir__)
records = YAML.safe_load(File.read(File.join(source, '_data/content-catalog.yml')), aliases: false)
relations = YAML.safe_load(File.read(File.join(source, '_data/content-relations.yml')), aliases: false)
registry = WritingContract.registry(source)
known_urls = Dir.glob(File.join(source, 'notes/*.md')).filter_map do |path|
  WritingContract.frontmatter(Pathname(path)).first['permalink']
end
errors = Sulemanji::ContentCatalog.validate(
  records: records, relations: relations, topics: registry['topics'].keys, known_urls: known_urls
)
abort(errors.join("\n")) unless errors.empty?
puts "Content catalog valid: #{records.length} public records, #{relations.length} directed relations."
