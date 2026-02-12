# Makefile for UnnamedProject
# Build tasks for release/deployment
# Dev tasks for running editors locally

.PHONY: all build scene dialog clean help dev dev-scene dev-dialog game check

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

# Build and run both editors (in background)
dev: build
	@echo "Starting both editors..."
	@cd Utils/scene_editor && bun run server.ts &
	@cd Utils/dialog_editor && bun run server.ts &
	@echo "Scene Editor: http://localhost:5174"
	@echo "Dialog Editor: http://localhost:5173"

# Build and run Scene Editor dev server
dev-scene: scene
	@echo "Starting Scene Editor on http://localhost:5174"
	@cd Utils/scene_editor && bun run server.ts

# Build and run Dialog Editor dev server
dev-dialog: dialog
	@echo "Starting Dialog Editor on http://localhost:5173"
	@cd Utils/dialog_editor && bun run server.ts

# ==================== GAME ====================

# Run the Love2D game
game:
	@echo "Starting Love2D game..."
	@love .

# Check Lua syntax for all game files
check:
	@echo "Checking Lua syntax..."
	@find engine -name '*.lua' -type f -print0 | xargs -0 -n1 luac -p
	@luac -p main.lua
	@echo "✓ Lua syntax check passed!"

# ==================== HELP ====================

help:
	@echo "BUILD tasks (for release/deployment):"
	@echo "  make          - Build both editors"
	@echo "  make scene    - Build Scene Editor only"
	@echo "  make dialog   - Build Dialog Editor only"
	@echo "  make clean    - Remove build outputs"
	@echo ""
	@echo "DEV tasks (for local development only):"
	@echo "  make dev          - Build and run both editors"
	@echo "  make dev-scene    - Build and run Scene Editor (port 5174)"
	@echo "  make dev-dialog   - Build and run Dialog Editor (port 5173)"
	@echo ""
	@echo "GAME tasks:"
	@echo "  make game     - Run the Love2D game"
	@echo "  make check    - Check Lua syntax (engine/**/*.lua + main.lua)"
