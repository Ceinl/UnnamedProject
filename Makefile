# Makefile for UnnamedProject
# Build tasks for release/deployment
# Dev tasks for running editors locally

.PHONY: all build scene dialog clean help dev dev-scene dev-dialog

# ==================== BUILD (for release/deployment) ====================

# Default target: build both editors
all: build

build: scene dialog

# Build Scene Editor
scene:
	@echo "Building Scene Editor..."
	@cd Utils/scene_editor && bun run build.ts
	@echo "✓ Scene Editor build complete!"

# Build Dialog Editor
dialog:
	@echo "Building Dialog Editor..."
	@cd Utils/dialog_editor && bun run build.ts
	@echo "✓ Dialog Editor build complete!"

# Build both editors (alias)
editors: build

# Clean build outputs
clean:
	@echo "Cleaning build outputs..."
	@rm -f Utils/scene_editor/public/app.js Utils/scene_editor/public/app.js.map
	@rm -f Utils/dialog_editor/public/app.js Utils/dialog_editor/public/app.js.map
	@echo "✓ Clean complete!"

# ==================== DEV (for local development only) ====================

# Run both editors (in background)
dev:
	@echo "Starting both editors..."
	@make dev-scene &
	@make dev-dialog &
	@echo "Scene Editor: http://localhost:5174"
	@echo "Dialog Editor: http://localhost:5173"

# Run Scene Editor dev server
dev-scene:
	@echo "Starting Scene Editor on http://localhost:5174"
	@cd Utils/scene_editor && bun run server.ts

# Run Dialog Editor dev server
dev-dialog:
	@echo "Starting Dialog Editor on http://localhost:5173"
	@cd Utils/dialog_editor && bun run server.ts

# ==================== HELP ====================

help:
	@echo "BUILD tasks (for release/deployment):"
	@echo "  make          - Build both editors"
	@echo "  make scene    - Build Scene Editor only"
	@echo "  make dialog   - Build Dialog Editor only"
	@echo "  make clean    - Remove build outputs"
	@echo ""
	@echo "DEV tasks (for local development only):"
	@echo "  make dev          - Run both editors"
	@echo "  make dev-scene    - Run Scene Editor (port 5174)"
	@echo "  make dev-dialog   - Run Dialog Editor (port 5173)"
