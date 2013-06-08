
test:
	./node_modules/.bin/litmus ./tests/suite.js

./node_modules/.bin/usenode-release:
	npm install --dev

release: ./node_modules/.bin/usenode-release test
	./node_modules/.bin/usenode-release .

.PHONY: release test
