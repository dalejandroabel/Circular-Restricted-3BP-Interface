SCOPE = local

clean:
	find . -name "*~" -delete

config:
	make SCOPE=$(SCOPE) config

install:config
	make -src install

pull:
	git pull
