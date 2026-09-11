/**
 * Brand content mirrored from www.webneststudio.co.in (.reference/frontend).
 * Used as graceful fallback whenever the FastAPI content endpoints are empty,
 * and as source copy for the Story / Services screens.
 */

export const BRAND = {
  name: 'WebNest Studio',
  tagline: 'Where Brands Go Digital.',
  hero: "We design and engineer websites, AI-powered products, and enterprise software that make your brand impossible to ignore — built on React, Java, Python, Spring Boot, and more.",
  site: 'www.webneststudio.co.in',
};

export const CONTACT = {
  phone: '+91 72769 71875',
  phoneHref: 'tel:+917276971875',
  email: 'vansh.duggal@webneststudio.co.in',
  emailHref: 'mailto:vansh.duggal@webneststudio.co.in',
  whatsappHref:
    'https://wa.me/917276971875?text=Hello%20WebNest%20Studio%2C%20I%27d%20like%20to%20discuss%20a%20premium%20digital%20experience%20for%20my%20brand.',
  instagramHref: 'https://www.instagram.com/webneststudio112026',
};

export const LEGAL = {
  privacyPolicyHref: 'https://www.webneststudio.co.in/privacy-policy',
  accountDeletionHref: 'https://www.webneststudio.co.in/account-deletion',
  accountDeletionEmailHref:
    'mailto:vansh.duggal@webneststudio.co.in?subject=WebNest%20Studio%20account%20deletion%20request',
};

export const VISION = {
  eyebrow: 'Our Vision',
  statement:
    'To make WebNest Studio the place where premium brands come to become unforgettable online.',
  body: 'We see a future where every serious business has access to digital craftsmanship that feels world-class: strategic, elegant, intelligent, and engineered to grow.',
};

export const FOUNDER = {
  name: 'Vansh Duggal',
  role: 'Founder, WebNest Studio',
  kicker: 'Founder-led digital craftsmanship',
};

export const FOUNDER_VISION = {
  eyebrow: 'Founder Vision',
  statement: 'A brand should feel premium before the customer ever speaks to you.',
  body: 'WebNest Studio serves ambitious founders and businesses that want their online presence to carry authority, elegance, and technical strength. Our work blends strategy, design, software, and AI so every brand we build has both beauty and backbone.',
  attribution: 'Vansh Duggal · Founder, WebNest Studio',
};

export const STORY_MARKERS = [
  {
    label: 'How we started',
    title: 'Built from a founder-first belief',
    body: 'WebNest Studio began with a simple conviction: a brand should not look ordinary online when its ambition is extraordinary. We help businesses turn unclear digital ideas into websites, systems, and launch-ready products with structure, taste, and technical discipline.',
  },
  {
    label: 'How we are growing',
    title: 'From websites to complete digital ecosystems',
    body: 'Our scope is expanding from premium websites into AI implementation, full-stack platforms, automation, database systems, and long-term digital growth partnerships — a studio that can stay with a client from first launch to serious scale.',
  },
  {
    label: 'Where we are headed',
    title: 'A premium technology house for ambitious brands',
    body: 'Our goal is to become the trusted digital partner for founders, luxury businesses, and growth-stage companies that want presence, performance, and polish in the same place.',
  },
];

export const SCOPE = [
  { icon: 'layers', title: 'Brand Websites', body: 'Premium business websites, landing pages, portfolios, and conversion-focused brand experiences.' },
  { icon: 'bar-chart-2', title: 'Growth Systems', body: 'CRM flows, lead capture, analytics, automation, and dashboards that turn attention into action.' },
  { icon: 'award', title: 'Luxury Positioning', body: 'Digital experiences shaped for trust, aspiration, and the kind of detail premium customers notice.' },
  { icon: 'trending-up', title: 'Scale Ready Tech', body: 'React, Java, Python, Spring Boot, APIs, and databases engineered for real business growth.' },
];

export const GOALS = [
  'Help 100+ brands launch or transform their digital presence with measurable business impact.',
  'Build a studio standard where design, engineering, strategy, and communication all feel premium.',
  'Expand into AI-led business tools that make operations faster, smarter, and easier to manage.',
];

export const PROCESS = [
  { step: '01', title: 'Discover', description: 'We learn your business, goals, and audience before writing a line of code.' },
  { step: '02', title: 'Design', description: 'Trend-forward UI/UX crafted to convert visitors into customers.' },
  { step: '03', title: 'Develop', description: 'Clean, scalable code across your chosen stack — React, Java, Python, and more.' },
  { step: '04', title: 'Deploy & Grow', description: 'Launch, monitor, and iterate with AI-driven insight and ongoing support.' },
];

export const TECH_CATEGORIES = [
  {
    title: 'Web Development',
    icon: 'globe',
    description:
      'Responsive, pixel-perfect front-end interfaces in React, backed by clean REST and GraphQL APIs. Every project follows a structured SDLC so releases stay predictable and production-ready.',
    technologies: ['React', 'HTML5 / CSS3', 'REST & GraphQL APIs', 'UI/UX Design', 'SDLC & QA'],
  },
  {
    title: 'Backend Engineering',
    icon: 'server',
    description:
      'Robust, high-performance back ends matched to your project — from enterprise Java systems to lightweight Go services — fast, secure, and easy to maintain as it scales.',
    technologies: ['Java', 'Spring Boot', 'Python', 'Go'],
  },
  {
    title: 'Artificial Intelligence',
    icon: 'cpu',
    description:
      'LLM-powered chatbots, recommendation engines, and intelligent automation integrated directly into your product — turning static websites into systems that respond, personalize, and learn.',
    technologies: ['LLM Integration', 'AI Chatbots', 'Recommendation Engines', 'Process Automation'],
  },
  {
    title: 'Cloud Technologies',
    icon: 'cloud',
    description:
      'Deploy and scale on modern cloud and enterprise infrastructure, with CI/CD pipelines and WebLogic deployment for zero-downtime releases and reliable uptime as traffic grows.',
    technologies: ['Cloud Hosting & Deployment', 'WebLogic & Enterprise Servers', 'CI/CD (Maven)', 'Monitoring & Auto-Scaling'],
  },
  {
    title: 'Enterprise Database',
    icon: 'database',
    description:
      'Design, tune, and migrate MySQL and Oracle databases built for scale — schema architecture and query optimization that keep performance steady under millions of records.',
    technologies: ['MySQL', 'Oracle', 'Schema Design & Migration', 'Query Optimization'],
  },
  {
    title: 'API & Systems Integration',
    icon: 'share-2',
    description:
      'Connect your website or application to payment gateways, CRMs, and legacy systems through clean REST and GraphQL API layers, so every part of your stack talks to each other reliably.',
    technologies: ['REST APIs', 'GraphQL', 'Third-Party Integrations', 'Webhooks & Automation'],
  },
];

export const TECH_MARQUEE = [
  'React', 'Java', 'Python', 'Spring Boot', 'MySQL', 'Oracle', 'WebLogic', 'Maven', 'GraphQL', 'Go',
];

export const STATS = [
  { value: '1', label: 'Projects Delivered' },
  { value: '24/7', label: 'Client Support' },
  { value: '100%', label: 'Custom-Built Solutions' },
  { value: '∞', label: 'Languages Supported' },
];

export const DELIVERED_PROJECTS = [
  {
    name: 'V Stitch by Anjali Nanda',
    url: 'https://www.vstitchbyanjalinanda.com',
    description:
      'A custom tailoring and fashion brand website — elegant design paired with effortless client booking. Now live in production.',
    phase: 'Phase 2 in progress',
  },
];

export const ONGOING_PROJECTS = [
  {
    name: 'Prime Pip Trade',
    url: 'https://www.primepiptrade.com',
    description:
      "A forex trading platform we're actively building out — focused on clarity, speed, and a trustworthy trading experience.",
  },
  {
    name: 'DivineVisionInfra',
    url: 'https://divinevisioninfra.com/',
    description: 'An infrastructure and real estate brand website, built to reflect trust and scale.',
  },
];

export const FALLBACK_FAQS = [
  {
    id: 'faq-process',
    category: 'Process',
    question: 'What does your design and development process look like?',
    answer:
      'A four-stage process: Discover (your business, goals, and audience), Design (trend-forward UI/UX built to convert), Develop (clean, scalable code across React, Java, Python, or your preferred stack), and Deploy & Grow (launch, monitoring, and iteration with data-driven insight).',
  },
  {
    id: 'faq-timeline',
    category: 'Process',
    question: 'How long does it take to build a website or web app?',
    answer:
      'A typical marketing website takes 4–6 weeks from discovery to launch. A more complex web application or AI-powered product usually takes 8–12 weeks. Enterprise systems with legacy integrations can run 3–6 months.',
  },
  {
    id: 'faq-custom',
    category: 'Services',
    question: 'Do you build custom or use website builders like Wix or WordPress?',
    answer:
      'We build fully custom websites and web applications using modern frameworks like React, rather than templated builders — for better performance, stronger SEO fundamentals, unlimited design flexibility, and a codebase you actually own and can scale.',
  },
  {
    id: 'faq-ai',
    category: 'AI',
    question: 'Do you offer AI implementation and chatbot development?',
    answer:
      'Yes. AI implementation is a core specialization — AI-powered chatbots, recommendation engines, and intelligent automation that integrate directly into your website or product, using modern LLM-based tooling.',
  },
  {
    id: 'faq-support',
    category: 'General',
    question: 'Do you provide ongoing maintenance and support after launch?',
    answer:
      'Yes. We offer 24/7 client support and ongoing maintenance plans covering security updates, performance monitoring, bug fixes, and feature enhancements. You can track project status through your client portal here in the app.',
  },
  {
    id: 'faq-consult',
    category: 'Pricing',
    question: 'Do you offer a free consultation before starting a project?',
    answer:
      'Yes. Every engagement starts with a free consultation where we learn about your goals, timeline, and budget, and recommend the right technology stack. Send a project query from the Contact tab, or reach us on WhatsApp.',
  },
];
