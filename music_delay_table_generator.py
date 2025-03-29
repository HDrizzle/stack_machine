# For creating lookup table to be used in `assembly_sources/stepper_music`

import math

CLOCK = 125000
MOVE_CYCLES = 24
HALT_CYCLES = 8
FREQ_LOOP_MOVES = 22

def main():
	# Initial calculations
	t_min = FREQ_LOOP_MOVES * MOVE_CYCLES / CLOCK
	t_max = (FREQ_LOOP_MOVES * MOVE_CYCLES + 256 * HALT_CYCLES) / CLOCK
	print(f"T min: {t_min * 1_000} ms, T max: {t_max * 1_000} ms")
	f_max = 1 / t_min
	f_min = 1 / t_max
	print(f"F min: {f_min} Hz, F max: {f_max} Hz")
	# Get list of frequencies, be sure to logarithmically distribute them so they are more concentrated at the lower end of the range
	exp_min = math.exp(f_min)
	exp_max = math.exp(f_max)
	for i in range(256):# i is for the lookup table so it starts at the lowest frequency and goes to the highest one
		# Scale i to a better distrubution of frequencies between f_min and f_max
		# TODO
	out = ""
	return 0

main()