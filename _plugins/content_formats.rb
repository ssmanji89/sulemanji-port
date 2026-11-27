require 'uri'
require 'jekyll'

module Sulemanji
  module ContentFormats
    module_function

    def validate_figure(item)
      errors = []
      slug = item['diagram'].to_s
      errors << "#{item['slug']}: invalid diagram asset" unless /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/.match?(slug)
      %w[diagram_alt diagram_caption diagram_text_equivalent].each do |field|
        errors << "#{item['slug']}: #{field} required" unless item[field].is_a?(String) && !item[field].strip.empty?
      end
      Array(item['sources']).each do |source|
        uri = URI.parse(source['href'].to_s)
        errors << "#{item['slug']}: source URL must be public HTTPS" unless uri.is_a?(URI::HTTPS) && uri.host && !uri.host.match?(/\A(?:localhost|.*\.local)\z/i)
      rescue URI::InvalidURIError
        errors << "#{item['slug']}: invalid source URL"
      end
      errors
    end

    def validate_cases(cases)
      Array(cases).flat_map { |item| item['diagram'] ? validate_figure(item) : [] }
    end
  end

  class ContentFormatsGenerator < Jekyll::Generator
    priority :highest

    def generate(site)
      cases = YAML.safe_load(File.read(File.join(site.source, '_data', 'work-cases.yml')), aliases: false) || []
      errors = ContentFormats.validate_cases(cases)
      raise Jekyll::Errors::FatalException, "content figures invalid: #{errors.join('; ')}" unless errors.empty?
    end
  end
end
