import ts from 'typescript-eslint'
import { fixupConfigRules } from '@eslint/compat'
import next from 'eslint-config-next/core-web-vitals'
const config = [
  ...fixupConfigRules(next),
  {languageOptions:{parser:ts.parser}},
  {ignores:['.next/**','node_modules/**','playwright-report/**','test-results/**']},
  {rules:{'@typescript-eslint/no-explicit-any':'off','react/no-unescaped-entities':'off','@next/next/no-img-element':'off'}}
]

export default config
