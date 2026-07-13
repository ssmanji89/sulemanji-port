# Suleman Manji Portfolio Site

This is the source code for my personal portfolio site, hosted at [sulemanji.com](https://www.sulemanji.com).

## Overview

This portfolio showcases my work as an Enterprise Technology Strategist, with a focus on cloud architecture, security engineering, and process automation.

## Sections

- **Projects**: Showcases technical solutions across multiple domains 
- **Technical Skills**: Detailed breakdown of technical expertise
- **NPM Packages**: Open-source JavaScript and Node.js packages
- **Experience**: Professional history with detailed metrics
- **Blog & Resources**: Technical articles and downloadable resources

## Technology

- Built with Jekyll and GitHub Pages
- Custom CSS framework
- Responsive design for all devices
- Dark mode support

## Development

To run this site locally:

1. Clone the repository
2. Install Jekyll and dependencies: `bundle install`
3. Start the local server: `bundle exec jekyll serve`
4. Visit `http://localhost:4000` in your browser

## Work With Me Worker

The AI Workflow Services intake and Priority Discovery flow live in `worker/`.
Run these checks before publishing site changes:

```bash
npm ci --prefix worker
npm run check --prefix worker
bundle exec jekyll build
python3 scripts/verify_work_with_me.py
python3 scripts/verify_viyu_positioning.py
python3 scripts/smoke_work_with_me_live.py
```

Production Worker secrets must be configured with `wrangler secret put NAME`;
never commit secret values. See `worker/README.md` for deployment gates, required
bindings, retention behavior, and test-mode UAT. The live smoke script checks
public wiring and protected service edges without submitting an intake, sending
email, or creating a payment.

## License

MIT License Copyright (c) 2025 sulemanji.com
