import { add } from '../src';

describe('Sample', () => {
	it('1 + 1 = 2', () => {
        let two = add(1, 1)
        expect(two).toBe(2)
	});
});
