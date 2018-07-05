/* jshint esversion: 6 */
import {parseNumber} from '../src';

describe('Check helpers', () => {
  it('Parse number', () => {
    const one = parseNumber(12345);
    expect(one.whole).toEqual(12345);
    expect(one.fractional).toEqual(0);

    const two = parseNumber(0.123456);
    expect(two.whole).toEqual(0);
    expect(two.fractional).toEqual(123456000);

    const three = parseNumber(9876543.123456785);
    expect(three.whole).toEqual(9876543);
    expect(three.fractional).toEqual(123456785);
  });
});