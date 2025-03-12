SCOPE = local

clean:
	find . -name "*~" -delete

config:
	make -C SCOPE=$(SCOPE) config

install:config
	make -C src install
