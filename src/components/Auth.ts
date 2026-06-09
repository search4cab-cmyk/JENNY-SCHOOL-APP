import { supabase } from '../services/supabase';

export class AuthComponent {
  static render(container: HTMLElement) {
    container.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <div class="text-center mb-6">
            <h1 class="header-title" style="font-size: 1.5rem; color: var(--primary);">Security Levy System</h1>
            <p class="text-muted mt-2" id="authSubtitle">Sign in to manage estate security records</p>
          </div>
          
          <form id="loginForm">
            <div class="form-group" id="nameGroup" style="display: none;">
              <label class="form-label">Full Name</label>
              <input type="text" id="fullName" class="form-control" placeholder="John Doe">
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" id="email" class="form-control" required placeholder="admin@estate.com">
            </div>
            <div class="form-group mb-6">
              <label class="form-label">Password</label>
              <input type="password" id="password" class="form-control" required placeholder="••••••••">
            </div>
            <button type="submit" id="authBtn" class="btn btn-primary w-100" style="padding: 12px; font-size: 1rem;">
              Sign In to Dashboard
            </button>
          </form>
          
          <div class="text-center mt-4">
            <button id="toggleAuth" class="btn btn-outline" style="border:none; padding:0; font-size:0.9rem;">
              Don't have an account? <strong>Sign Up</strong>
            </button>
          </div>

          <div id="authError" class="mt-4 text-center" style="color: var(--danger); font-size: 0.9rem; display: none;"></div>
          <div id="authSuccess" class="mt-4 text-center" style="color: var(--success); font-size: 0.9rem; display: none;"></div>
        </div>
      </div>
    `;

    let isLogin = true;

    document.getElementById('toggleAuth')?.addEventListener('click', (e) => {
      e.preventDefault();
      isLogin = !isLogin;
      const subtitle = document.getElementById('authSubtitle')!;
      const btn = document.getElementById('authBtn')!;
      const toggleBtn = document.getElementById('toggleAuth')!;
      const nameGroup = document.getElementById('nameGroup')!;
      const nameInput = document.getElementById('fullName') as HTMLInputElement;
      const errorDiv = document.getElementById('authError')!;
      const successDiv = document.getElementById('authSuccess')!;
      
      errorDiv.style.display = 'none';
      successDiv.style.display = 'none';

      if (isLogin) {
        subtitle.textContent = 'Sign in to manage estate security records';
        btn.textContent = 'Sign In to Dashboard';
        toggleBtn.innerHTML = "Don't have an account? <strong>Sign Up</strong>";
        nameGroup.style.display = 'none';
        nameInput.removeAttribute('required');
      } else {
        subtitle.textContent = 'Create an account to manage estate security records';
        btn.textContent = 'Create Account';
        toggleBtn.innerHTML = "Already have an account? <strong>Sign In</strong>";
        nameGroup.style.display = 'block';
        nameInput.setAttribute('required', 'true');
      }
    });

    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (document.getElementById('email') as HTMLInputElement).value;
      const password = (document.getElementById('password') as HTMLInputElement).value;
      const fullName = (document.getElementById('fullName') as HTMLInputElement).value;
      
      const errorDiv = document.getElementById('authError') as HTMLElement;
      const successDiv = document.getElementById('authSuccess') as HTMLElement;
      
      const btn = document.getElementById('authBtn') as HTMLButtonElement;
      const originalText = btn.textContent;
      btn.textContent = 'Authenticating...';
      btn.disabled = true;

      errorDiv.style.display = 'none';
      successDiv.style.display = 'none';

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          errorDiv.textContent = error.message;
          errorDiv.style.display = 'block';
          btn.textContent = originalText;
          btn.disabled = false;
        } else {
          window.location.reload();
        }
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });
        
        if (error) {
          errorDiv.textContent = error.message;
          errorDiv.style.display = 'block';
          btn.textContent = originalText;
          btn.disabled = false;
        } else {
          successDiv.textContent = 'Account created successfully! You can now sign in.';
          successDiv.style.display = 'block';
          document.getElementById('toggleAuth')?.click();
          btn.textContent = 'Sign In to Dashboard';
          btn.disabled = false;
        }
      }
    });
  }
}
