SCOPE = local

clean:
	find . -name "*~" -delete

config:
	make -C src SCOPE=$(SCOPE) config

install:config
	make -C src install
	cd server;npm install

pull:
	git pull
env:
	python3 -m venv .crtbpenv
	.crtbpenv/bin/pip install -r requirements.txt