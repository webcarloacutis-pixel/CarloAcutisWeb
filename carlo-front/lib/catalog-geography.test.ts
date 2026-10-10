import { expect, it } from 'vitest'
import { geographicName } from './catalog-geography'
it('localizes geography independently of stored catalog filters and preserves unknown input',()=>{
  expect(geographicName('europe','en')).toBe('Europe')
  expect(geographicName('DE','en')).toBe('Germany')
  expect(geographicName('DE','es')).toBe('Alemania')
  expect(geographicName('invalid','en')).toBe('invalid')
})
