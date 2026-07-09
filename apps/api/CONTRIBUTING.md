# Contributing to Base Django API

First off, thank you for considering contributing to Base Django API! It's people like you who make this project such a great boilerplate for the developer community.

When contributing, please follow the guidelines below to ensure a smooth collaboration process.

---

## 🛠️ Local Development Setup

1. **Fork the Repository** and clone your fork:
   ```bash
   git clone https://github.com/your-username/BaseDjangoApi.git
   cd BaseDjangoApi
   ```

2. **Create a Local Environment File**:
   ```bash
   cp .env.example .env
   # Modify values if needed. Keep USE_SQLITE=True for local, zero-config setup.
   ```

3. **Set Up a Virtual Environment** and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Run Migrations & Create Superuser**:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

5. **Start the Development Server**:
   ```bash
   python manage.py runserver
   ```

---

## 🧪 Testing

We value high test coverage. Before submitting a Pull Request, ensure that all tests pass and write new tests for any added features or fixed bugs.

To run the test suite:
```bash
USE_SQLITE=True python manage.py test
```

---

## 🎨 Code Style Guidelines

- **PEP 8**: Follow standard PEP 8 python formatting rules.
- **Formatting**: We suggest using `black` or `ruff` to automatically format Python code.
- **Docstrings & Comments**: Add meaningful docstrings and comments for complex business logic, but keep code clean and self-documenting.

---

## 📬 Pull Request Process

1. **Create a New Branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/your-bugfix-name
   ```
2. **Commit Your Changes** with clear, descriptive commit messages.
3. **Push to Your Fork** and submit a **Pull Request** against the `main` branch.
4. Fill out the PR template checklist to explain what changes you made.
5. Once submitted, our GitHub Actions CI will run your tests automatically. An admin will review your PR and merge it.

Thank you for your contributions!
