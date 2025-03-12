SCOPE = local

clean:
	find . -name "*~" -delete

clean_cache:
	@echo "Installing node modules..."
	-rm -rf package-lock.json

clean_modules:
	@echo "Installing node modules..."
	-rm -rf package-lock.json node_modules

cleanall:clean clean_modules clean_cache

run:
	npm run dev

install:cleanall
	@echo "(Re)installing node modules..."
	npm install

recache:clean_cache
	@echo "Cleaning cache..."
	npm install --package-lock-only

config:clean
	@echo "Configuring..."
	cp package.json.$(SCOPE) package.json
	cp vite.config.ts.$(SCOPE) vite.config.ts
	@echo "For a different configuration use: make SCOPE=server config"

reset_server:
	make -C .. pull
	make SCOPE=server config
	make run
