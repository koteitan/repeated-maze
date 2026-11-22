# tetra-M: M = number of passes (A = 2).  b ends as 2^2^...^2 (M+1 twos).
# `make tetra-1.maze` etc. builds other M.
MS = 2 3 4
HS4D = $(MS:%=tetra-%-4d.hs)
HS2D = $(MS:%=tetra-%-2d.hs)
MAZES = $(MS:%=tetra-%.maze)

HS2MAZE = ../../tools/hs2maze/hs2maze.py
ND_TO_2D = ../../tools/nd-to-2d/nd-to-2d.py
ND_TO_2D_FLAGS = --fuse
MAKE_TETRA = ./make-tetra.py

all: $(HS4D) $(HS2D) $(MAZES)

tetra-%-4d.hs: $(MAKE_TETRA)
	python3 $(MAKE_TETRA) $* > $@

tetra-%-2d.hs: tetra-%-4d.hs $(ND_TO_2D)
	python3 $(ND_TO_2D) $(ND_TO_2D_FLAGS) $< > $@

tetra-%.maze: tetra-%-2d.hs $(HS2MAZE)
	python3 $(HS2MAZE) $< > $@

clean:
	rm -f $(HS4D) $(HS2D) $(MAZES)

.PHONY: all clean
