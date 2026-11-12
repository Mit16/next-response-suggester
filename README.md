# Next Response Suggester

**An AI-powered assistant for understanding conversations and generating natural, context-aware replies.**

Next Response Suggester aims to help people communicate more naturally by analyzing conversational context and suggesting relevant responses based on the conversation's tone, intent, and direction.

Instead of generating generic AI replies, the goal is to understand what's happening in a conversation and provide suggestions that actually make sense in that moment.

> **Project status:** Early development. The initial monorepo structure and Prompt Laboratory workspace have been established. Core conversation analysis and response-generation functionality are under development.

---

## The Idea

Sometimes the difficult part of a conversation isn't knowing what to say, but figuring out *how* to say it.

A conversation might require a funny response, a thoughtful reply, a playful comeback, or simply a natural way to keep things going.

Next Response Suggester is being designed to address this by combining conversational understanding with controlled response generation.

### Core capabilities (planned)

- **Context awareness:** Understand the conversation rather than treating the latest message in isolation.
- **Tone-based generation:** Generate replies in different styles, including normal, funny, playful, flirty, caring, confident, and professional.
- **Intent-aware suggestions:** Adapt responses to goals such as continuing a conversation, asking a question, responding to a dry reply, or asking someone out.
- **Multiple suggestions:** Provide several alternative responses instead of a single generated answer.
- **Conversation intelligence:** Identify conversational mood, intent, engagement, and direction.
- **Respectful communication:** Recognize disinterest and conversational boundaries instead of encouraging pushy or inappropriate replies.

---

## Architecture

The project follows a modular architecture, with a dedicated experimentation environment for prompt engineering and model evaluation.

```text
next-response-suggester/
│
├── apps/
│   └── api/                    # Backend application
│
├── mobile/                     # Android application
│
├── packages/
│   └── shared-types/           # Shared application types
│
├── prompt-lab/                 # Prompt engineering and evaluation
│   ├── evaluations/
│   ├── prompts/
│   ├── scenarios/
│   ├── scripts/
│   └── src/
│       ├── config/
│       ├── engine/
│       ├── evaluation/
│       ├── prompts/
│       ├── providers/
│       ├── schemas/
│       └── types/
│
├── docker-compose.yml
├── package.json
└── README.md
```

### Planned technology stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Runtime | Node.js |
| AI experimentation | Groq API |
| Validation | Zod |
| Logging | Pino |
| Backend | NestJS |
| Database | PostgreSQL |
| ORM | Prisma |
| Mobile | Kotlin, Jetpack Compose |
| Infrastructure | Docker |

The stack may evolve as implementation and evaluation progress.

---

## Development Approach

The project is being developed in phases rather than building the entire application at once.

### Phase 0 — Prompt Laboratory

Establish a reliable foundation for experimenting with prompts and evaluating AI-generated responses.

- Define structured conversation and response schemas.
- Build a conversation-analysis pipeline.
- Implement configurable response-generation prompts.
- Integrate an LLM provider through a provider abstraction.
- Create a benchmark dataset of realistic conversations.
- Evaluate response relevance, naturalness, tone consistency, and contextual accuracy.

### Phase 1 — Backend Foundation

Build the backend around the validated AI pipeline.

- Modular backend architecture.
- API endpoints for conversation analysis and reply suggestions.
- Provider abstraction and configuration.
- Anonymous device registration.
- Usage tracking and rate limiting.
- Feedback collection.

### Phase 2 — Conversation Intelligence

Improve the system's ability to understand conversations.

- Mood and intent detection.
- Engagement analysis.
- Conversation direction and topic identification.
- Context-aware tone selection.
- Boundary and disinterest detection.
- Response ranking and quality evaluation.

### Phase 3 — Android Application

Build the Android client using Kotlin and Jetpack Compose.

- Conversation input interface.
- Tone and intent selection.
- Suggested reply presentation.
- Copy and share functionality.
- Feedback collection.

### Phase 4 — Optimization and Release

- Benchmark different models and providers.
- Improve latency and response quality.
- Evaluate privacy and security.
- Conduct real-world beta testing.
- Optimize operational costs.

---

## Design Principles

The project follows a few important principles:

1. **Context over keywords:** Understand the conversation before generating a response.
2. **Quality over quantity:** A few useful suggestions are better than dozens of generic ones.
3. **Provider independence:** Keep the application independent of a single LLM provider.
4. **Privacy by design:** Avoid retaining raw conversations or screenshots unnecessarily.
5. **Modular architecture:** Keep conversation analysis, prompt construction, generation, and evaluation independently testable.
6. **Measurable quality:** Evaluate generated responses against realistic scenarios instead of relying on subjective impressions alone.

---

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm
- A Groq API key for AI integration

### Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/next-response-suggester.git
cd next-response-suggester
```

Install dependencies:

```bash
npm install
```

Configure the Prompt Laboratory environment:

```bash
cp prompt-lab/.env.example prompt-lab/.env
```

Add your Groq API key and other required configuration to `prompt-lab/.env` according to the environment template.

### Available Commands

Run the Prompt Laboratory in development mode:

```bash
npm run lab:dev
```

Build the Prompt Laboratory:

```bash
npm run lab:build
```

Run type checking:

```bash
npm run lab:typecheck
```

Run tests:

```bash
npm run lab:test
```

**Note:** The workspace and scripts are being established incrementally. Some commands may not yet represent completed application functionality.

---

## Privacy

The intended design is privacy-conscious:

- Raw conversations should be processed only when needed.
- Conversation content should not be retained by the application unnecessarily.
- API credentials must remain on the backend.
- Feedback and analytics should avoid collecting personal conversation content.

Privacy and data-handling behavior will be verified as the application is implemented.

---

## Current Status

| Component | Status |
|---|---|
| Repository and workspace setup | Completed |
| Prompt Laboratory scaffolding | Completed |
| Environment configuration | Initial setup |
| Conversation benchmark dataset | Pending |
| Conversation analysis engine | Pending |
| Response generation pipeline | Pending |
| Model evaluation | Pending |
| Backend API | Planned |
| Android application | Planned |

---

## Contributing

The project is currently under active development. Contributions, suggestions, and technical discussions are welcome.

If you find a bug or have an idea for improving conversational quality, feel free to open an issue.

---

## License

This project is intended to be released under the MIT License. A license file will be added when the licensing decision is finalized.
