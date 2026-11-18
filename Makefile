# ==============================================================================
# RoutineKit · DIU Timetable & Routine Planner
# Makefile for development, build, test, and data scraper pipelines
# ==============================================================================

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

# ------------------------------------------------------------------------------
# Configuration & Variables
# ------------------------------------------------------------------------------
PORT        ?= 3000
VENV_DIR    ?= .venv
PYTHON      := $(if $(wildcard $(VENV_DIR)/bin/python),$(VENV_DIR)/bin/python,python3)
PIP         := $(if $(wildcard $(VENV_DIR)/bin/pip),$(VENV_DIR)/bin/pip,pip3)
LOCAL_PDF   ?=

# Terminal Colors
RED    := \033[31m
CYAN   := \033[36m
GREEN  := \033[32m
YELLOW := \033[33m
BLUE   := \033[34m
BOLD   := \033[1m
RESET  := \033[0m

# ------------------------------------------------------------------------------
# Help / Overview
# ------------------------------------------------------------------------------
.PHONY: help
help: ## Display this interactive help menu
	@printf "\n"
	@printf "$(BOLD)$(GREEN)RoutineKit DIU$(RESET) - Developer & Pipeline Tasks\n"
	@printf "==================================================================\n"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(CYAN)%-18s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\n"
	@printf "$(BOLD)Variables:$(RESET)\n"
	@printf "  $(YELLOW)PORT$(RESET)=3000         Dev server listening port (e.g. make dev PORT=3002)\n"
	@printf "  $(YELLOW)LOCAL_PDF$(RESET)=<file>  Local PDF path for routine parser (e.g. make scrape-local LOCAL_PDF=routine.pdf)\n"
	@printf "\n"

# ------------------------------------------------------------------------------
# Installation & Setup
# ------------------------------------------------------------------------------
.PHONY: setup install install-node install-python

setup: install ## Complete initial setup (Node.js + Python venv)

install: install-node install-python ## Install all dependencies (Node.js and Python)

install-node: ## Install Node.js npm packages
	@printf "$(CYAN)Installing Node.js dependencies...$(RESET)\n"
	npm install

install-python: ## Create Python virtualenv and install scraper requirements
	@printf "$(CYAN)Setting up Python environment...$(RESET)\n"
	@if [ ! -d "$(VENV_DIR)" ]; then \
		printf "Creating virtualenv at $(VENV_DIR)...\n"; \
		python3 -m venv $(VENV_DIR); \
	fi
	@printf "Installing scraper requirements from scraper/requirements.txt...\n"
	$(PIP) install -r scraper/requirements.txt

# ------------------------------------------------------------------------------
# Development
# ------------------------------------------------------------------------------
.PHONY: dev dev-port

dev: ## Start Next.js development server (default port: 3000)
	@printf "$(GREEN)Starting Next.js dev server on port $(PORT)...$(RESET)\n"
	npm run dev -- -p $(PORT)

dev-port: ## Alias to start dev server with custom PORT (e.g. make dev-port PORT=3002)
	@printf "$(GREEN)Starting Next.js dev server on port $(PORT)...$(RESET)\n"
	npm run dev -- -p $(PORT)

# ------------------------------------------------------------------------------
# Build & Production
# ------------------------------------------------------------------------------
.PHONY: build start preview

build: ## Build Next.js production bundle and static export
	@printf "$(CYAN)Building production application...$(RESET)\n"
	npm run build

start: ## Start Next.js production server
	@printf "$(GREEN)Starting production server...$(RESET)\n"
	npm run start

preview: build ## Build and preview static output using npx serve
	@printf "$(CYAN)Serving static build from 'out/' directory on port $(PORT)...$(RESET)\n"
	npx serve out -l $(PORT)

# ------------------------------------------------------------------------------
# Testing & Code Quality
# ------------------------------------------------------------------------------
.PHONY: test test-schedule test-exports lint check

test: ## Run all schedule logic and ICS export tests
	@printf "$(CYAN)Running comprehensive test suite...$(RESET)\n"
	npm test

test-schedule: ## Run schedule resolution, retake filtering, and overlap tests
	@printf "$(CYAN)Running schedule logic tests...$(RESET)\n"
	npx tsx scripts/test-schedule.mjs

test-exports: ## Run ICS and PDF calendar export tests
	@printf "$(CYAN)Running calendar export tests...$(RESET)\n"
	npx tsx scripts/test-exports.mjs

lint: ## Run ESLint checks
	@printf "$(CYAN)Running ESLint...$(RESET)\n"
	npm run lint

check: test build ## Run full verification: unit tests and production build

# ------------------------------------------------------------------------------
# Routine Scraper & Parser Pipeline
# ------------------------------------------------------------------------------
.PHONY: scrape scrape-local

scrape: ## Run automated routine discovery, parser, validator, and publish pipeline
	@printf "$(GREEN)Running routine scraper pipeline...$(RESET)\n"
	$(PYTHON) scraper/scraper.py

scrape-local: ## Parse and publish from a local routine PDF (specify LOCAL_PDF=path/to/routine.pdf)
	@if [ -z "$(LOCAL_PDF)" ]; then \
		printf "$(RED)Error: Please specify LOCAL_PDF (e.g. make scrape-local LOCAL_PDF=routine.pdf)$(RESET)\n"; \
		exit 1; \
	fi
	@printf "$(GREEN)Parsing routine from local PDF: $(LOCAL_PDF)...$(RESET)\n"
	$(PYTHON) scraper/scraper.py --local-pdf "$(LOCAL_PDF)"

# ------------------------------------------------------------------------------
# Cleaning & Maintenance
# ------------------------------------------------------------------------------
.PHONY: clean clean-all

clean: ## Clean build artifacts (.next, out, cache, and Python pycache)
	@printf "$(YELLOW)Cleaning build caches and output directories...$(RESET)\n"
	rm -rf .next out .turbo tsconfig.tsbuildinfo
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@printf "$(GREEN)Clean complete.$(RESET)\n"

clean-all: clean ## Deep clean removing build caches, node_modules, and python venv
	@printf "$(RED)Removing node_modules and Python virtualenv...$(RESET)\n"
	rm -rf node_modules $(VENV_DIR)
	@printf "$(GREEN)Deep clean complete. Run 'make setup' to reinitialize.$(RESET)\n"
