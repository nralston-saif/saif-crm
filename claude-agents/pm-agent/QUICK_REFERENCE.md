# PM Agent Quick Reference

## Getting Started

Place `CLAUDE.md` in your project root or in a `.claude/` directory. Claude Code will automatically use it as context.

## Example Prompts

### Full Product Review

```
Review my app comprehensively. 

Context:
- Stage: MVP launching in 2 weeks
- Target users: Small business owners managing inventory
- Business model: Freemium with $29/mo pro tier
- Main competitors: Sortly, inFlow

Start by exploring the codebase and UI, then give me your full assessment.
```

### Onboarding Review

```
Focus specifically on our onboarding flow. 

Walk through it as a new user would and identify:
1. Where do users drop off?
2. What's confusing?
3. How can we reduce time-to-value?
```

### Feature Prioritization

```
I'm trying to decide what to build next. Here are our options:

1. Dark mode
2. Export to CSV
3. Team collaboration features
4. Mobile app
5. API for integrations

Our goals: increase retention and reduce churn (currently 8% monthly)
Resources: 2 engineers for 6 weeks

Help me prioritize.
```

### Competitive Analysis

```
Compare our product to [Competitor Name].

I want to understand:
- Where are we stronger?
- Where are we weaker?
- What's our differentiation opportunity?
- What should we copy vs. ignore?
```

### Pricing Review

```
Review our pricing strategy:

Current tiers:
- Free: 100 items, 1 user
- Pro ($29/mo): Unlimited items, 5 users
- Team ($99/mo): Unlimited everything

Questions:
- Is the free tier too generous?
- Are we leaving money on the table?
- What features should gate each tier?
```

### UX Teardown

```
Do a UX teardown of the [specific feature/page].

Focus on:
- Usability issues
- Accessibility problems  
- Mobile experience
- Edge cases and error states
```

### Growth Mechanics

```
Analyze our growth loops and retention mechanics.

Current state:
- DAU/MAU: 0.3
- Week 1 retention: 40%
- Week 4 retention: 15%

What mechanics should we add to improve retention?
```

### Pre-Launch Checklist

```
We're launching in 2 weeks. Do a pre-launch audit and tell me:

1. What's a blocker to launch?
2. What will embarrass us if we ship it?
3. What can wait until post-launch?
4. What's our biggest risk?
```

### User Flow Optimization

```
Optimize this user flow:

Current: Landing → Signup → Email verify → Onboarding (8 steps) → Dashboard → Create first item

Goal: Get users to create their first item ASAP
Constraint: We need email verification for security

How should we restructure this?
```

### Copy Review

```
Review the copy/microcopy throughout the app.

Focus on:
- Clarity
- Tone consistency  
- Error messages
- Empty states
- CTAs
```

## Tips for Best Results

### 1. Provide Context
The more context you give, the better the feedback:
- What stage is your product?
- Who are your users?
- What are you optimizing for?
- What constraints do you have?

### 2. Be Specific About What You Want
- "Review everything" → broad feedback
- "Focus on checkout flow" → deep, specific feedback

### 3. Share Your Hypotheses
"I think users are dropping off because X" helps the agent validate or challenge your assumptions.

### 4. Include Metrics When Available
Actual data makes recommendations more concrete and prioritized.

### 5. Mention Known Issues
"I already know X is broken" prevents redundant feedback and lets the agent focus on what you don't know.

## Output Formats

### For Quick Feedback
```
Give me a quick hit list of the top 5 issues in priority order.
```

### For Stakeholder Presentations
```
Format this as an executive summary I can share with my co-founder.
```

### For Engineering Handoff
```
Create tickets/issues for each recommendation with acceptance criteria.
```

### For Documentation
```
Document your findings in a formal product review document.
```

## Combining with Other Claude Code Features

### With Code Review
```
Review both the UX and the code quality. Flag any technical debt that impacts the user experience.
```

### With Implementation
```
After your review, help me implement the top critical fix.
```

### With Documentation
```
After the review, update our product requirements doc with the new priorities.
```
