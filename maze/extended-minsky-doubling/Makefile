# exmd<M>-<K>: multiply by M, K times (value M^K).
MKS = 2-2 2-4 2-6 2-8 2-10 2-12 \
      3-2 3-4 3-5 3-6 3-7 3-8 3-10 3-12 \
      4-2 4-4 4-5 4-6 4-7 4-8 4-10 4-12 \
      5-2 5-4 5-5 5-6 5-8 5-10 5-12 \
      6-2 6-4 6-5 6-6 6-8 6-10 6-12 \
      7-2 7-4 7-6 7-8 7-10 7-12 \
      8-2 8-4 8-6 8-8 8-10 8-12 \
      9-2 9-3 9-4 9-6 9-8 9-10 \
      10-2 10-4 10-6 10-8 10-10 \
      12-2 12-4 12-6 12-8 12-10 \
      14-2 14-4 14-6 14-8 14-10 \
      16-2 16-4 16-6 16-8 16-10
HS = $(MKS:%=exmd%.hs)
MAZES = $(MKS:%=exmd%.maze)

HS2MAZE = ../../tools/hs2maze/hs2maze.py
MAKE_EXMD = ./make-exmd.py

all: $(HS) $(MAZES)

exmd%.hs: $(MAKE_EXMD)
	python3 $(MAKE_EXMD) $(subst -, ,$*) > $@

exmd%.maze: exmd%.hs $(HS2MAZE)
	python3 $(HS2MAZE) $< > $@

clean:
	rm -f $(HS) $(MAZES)

.PHONY: all clean
