---
name: deploy-sanity
description: Deploy Sanity schema and Studio to noima.sanity.studio
disable-model-invocation: true
---

Deploy Sanity schema and Studio in sequence:

1. Run `npx sanity schema deploy` to push the schema to the Content Lake
2. Run `npx sanity deploy` to deploy the Studio to noima.sanity.studio

Report the result of each step. If either step fails, stop and report the error.
