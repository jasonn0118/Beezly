#!/bin/bash
set -e

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up standalone uv environment for Price Tag OCR project...${NC}"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo -e "${YELLOW}uv is not installed. Installing uv...${NC}"
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # Add uv to PATH for this session
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Create a virtual environment if it doesn't exist
ENV_DIR=".venv"
if [ ! -d "$ENV_DIR" ]; then
    echo -e "${GREEN}Creating virtual environment...${NC}"
    uv venv
else
    echo -e "${YELLOW}Virtual environment already exists at $ENV_DIR.${NC}"
fi

# Activate the virtual environment
echo -e "${GREEN}Activating virtual environment...${NC}"
source "$ENV_DIR/bin/activate"

# Install dependencies directly from requirements.txt
echo -e "${GREEN}Installing dependencies with uv...${NC}"
if [ -f "requirements.txt" ]; then
    uv pip install -r requirements.txt
else
    echo -e "${RED}requirements.txt not found in current directory!${NC}"
    exit 1
fi

# Install LangGraph and its dependencies explicitly
echo -e "${GREEN}Installing LangGraph and its dependencies...${NC}"
uv pip install langgraph>=0.5.0 langchain>=0.3.0 langchain-core>=0.3.0 langsmith>=0.4.0

# Install system dependencies for OpenCV
echo -e "${GREEN}Checking system dependencies for OpenCV...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${YELLOW}macOS detected. You may need to install dependencies manually if OpenCV has issues.${NC}"
    echo -e "Consider running: brew install opencv"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo -e "${YELLOW}Linux detected. Installing system dependencies...${NC}"
    echo -e "${YELLOW}You may need to run the following command:${NC}"
    echo -e "sudo apt-get update && sudo apt-get install -y libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev"
fi

# Create a simple test script to verify imports
TEST_SCRIPT="import_test.py"
cat > $TEST_SCRIPT << 'EOL'
import sys
print(f"Using Python: {sys.executable}")

try:
    import torch
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
except ImportError as e:
    print(f"Failed to import torch: {e}")

try:
    import modal
    print(f"Modal version: {modal.__version__}")
except ImportError as e:
    print(f"Failed to import modal: {e}")

try:
    import langgraph
    # langgraph doesn't have __version__ attribute, so we'll just check if it's imported
    print(f"LangGraph imported successfully")
    # Try to import some key components to verify installation
    from langgraph.graph import StateGraph
    print(f"LangGraph StateGraph imported successfully")
except ImportError as e:
    print(f"Failed to import langgraph: {e}")

try:
    import langchain
    print(f"LangChain version: {langchain.__version__}")
except ImportError as e:
    print(f"Failed to import langchain: {e}")
EOL

# Check if packages are installed correctly
echo -e "${GREEN}Verifying package installations...${NC}"
python $TEST_SCRIPT

# Clean up test script
rm $TEST_SCRIPT

echo -e "${GREEN}Environment setup complete!${NC}"
echo -e "${YELLOW}To activate this environment in the future, run:${NC}"
echo -e "source $ENV_DIR/bin/activate"

# Print instructions for next steps
echo -e "${GREEN}Next steps:${NC}"
echo -e "1. Activate the environment: ${YELLOW}source $ENV_DIR/bin/activate${NC}"
echo -e "2. Run your code: ${YELLOW}cd ../price-project && python download_model.py${NC}"