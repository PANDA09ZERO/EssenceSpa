const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, process, setTimeout, clearTimeout, require(name) {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected import ${name}`);
  } });
  return exports;
}
const next = { NextResponse: { json(body, options = {}) { return { body, status: options.status || 200, headers: options.headers }; } } };
const request = email => ({ json: async () => ({ email, password: 'test-password-only' }) });

test('simultaneous logins keep their own identity and disable persisted server sessions', async () => {
  let clients = 0;
  const route = load('app/api/auth/login/route.ts', {
    'next/server': next,
    '@supabase/supabase-js': { createClient(_url, _key, options) {
      clients++;
      assert.equal(options.auth.persistSession, false);
      assert.equal(options.auth.autoRefreshToken, false);
      let current;
      return { auth: { async signInWithPassword({ email }) {
        current = { id: email, email };
        await new Promise(resolve => setTimeout(resolve, 5));
        return { data: { user: current, session: { user: current } }, error: null };
      } } };
    } },
  });
  const [a, b] = await Promise.all([route.POST(request('one@example.test')), route.POST(request('two@example.test'))]);
  assert.equal(clients, 2);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.equal(a.body.data.user.email, 'one@example.test');
  assert.equal(b.body.data.user.email, 'two@example.test');
  assert.equal(a.headers['Cache-Control'], 'no-store');
});

test('a failed password cannot create an account or return the previous user', async () => {
  const route = load('app/api/auth/login/route.ts', {
    'next/server': next,
    '@supabase/supabase-js': { createClient: () => ({ auth: {
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Invalid credentials' } }),
      signUp: () => assert.fail('Login must never register a new account'),
    } }) },
  });
  const result = await route.POST(request('wrong@example.test'));
  assert.equal(result.status, 401);
  assert.equal(result.body.data, undefined);
});

test('a response containing another account is rejected', async () => {
  const other = { id: 'other', email: 'other@example.test' };
  const route = load('app/api/auth/login/route.ts', {
    'next/server': next,
    '@supabase/supabase-js': { createClient: () => ({ auth: {
      signInWithPassword: async () => ({ data: { user: other, session: { user: other } }, error: null }),
    } }) },
  });
  assert.equal((await route.POST(request('one@example.test'))).status, 401);
});

test('session lookup requires a supplied token, never the last server login', async () => {
  const route = load('app/api/auth/route.ts', {
    'next/server': next,
    './login/route': {},
    '@supabase/supabase-js': { createClient: () => assert.fail('Missing token must not access shared Auth state') },
  });
  assert.equal((await route.GET({ headers: { get: () => null } })).status, 401);
});

test('the visible account follows the latest auth event and clears after sign-out', () => {
  const states = [];
  const effects = [];
  let listener;
  const provider = load('components/layout/SupabaseProvider.tsx', {
    react: {
      useState(value) { const i = states.length; states.push(value); return [value, next => { states[i] = next; }]; },
      useRef: value => ({ current: value }),
      useEffect: effect => effects.push(effect),
      createContext: () => ({ Provider: 'provider' }),
    },
    'react/jsx-runtime': { jsx: () => null },
    'next/navigation': { useRouter: () => ({ replace() {} }), usePathname: () => '/login' },
    '@/lib/supabase': { supabase: { auth: {
      getSession: () => assert.fail('A competing session read can overwrite the latest sign-in'),
      onAuthStateChange(callback) { listener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
    } } },
  });
  provider.SupabaseProvider({ children: null });
  const cleanup = effects[0]();
  const session = email => ({ user: { id: email, email, user_metadata: {} } });
  listener('INITIAL_SESSION', session('previous@example.test'));
  listener('SIGNED_IN', session('new@example.test'));
  assert.equal(states[0].email, 'new@example.test');
  assert.equal(states[1], false);
  listener('SIGNED_OUT', null);
  assert.equal(states[0], null);
  cleanup();
});
