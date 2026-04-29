KS = 4 5 6
HS = $(KS:%=cp2-%.hs)
MAZES = $(KS:%=cp2-%.maze)

HS2MAZE = ../../tools/hs2maze/hs2maze.py
MAKE_CP2 = ./make-cp2.py

all: $(HS) $(MAZES)

cp2-%.hs: $(MAKE_CP2)
	python3 $(MAKE_CP2) $* > $@

cp2-%.maze: cp2-%.hs $(HS2MAZE)
	python3 $(HS2MAZE) $< > $@

clean:
	rm -f $(HS) $(MAZES)

.PHONY: all clean
