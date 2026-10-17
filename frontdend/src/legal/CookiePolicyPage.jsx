import { Link } from 'react-router-dom';
import { LegalLayout } from './LegalLayout';
import { LEGAL } from './siteInfo';

export function CookiePolicyPage() {
  const L = LEGAL;
  return (
    <LegalLayout title="Cookie Policy">
      <p>
        {L.productName} does <strong>not</strong> use cookies. It uses no advertising, analytics,
        social-media or other third-party trackers, and all fonts and images are served from our own
        server.
      </p>
      <p>
        To keep you signed in, {L.productName} stores a few items in your browser's own storage
        (sessionStorage and localStorage). These are not cookies: they are never sent to other websites
        and are only read by {L.productName} itself.
      </p>

      <h2>What we store in your browser</h2>
      <table>
        <thead>
          <tr><th>Name</th><th>Type</th><th>Purpose</th><th>How long</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>token</code>, <code>refresh_token</code></td>
            <td>Strictly necessary</td>
            <td>Keeps you signed in while you use the app</td>
            <td>Until you log out or close the browser tab</td>
          </tr>
          <tr>
            <td><code>user</code></td>
            <td>Strictly necessary</td>
            <td>Your name and role, so pages show the right options</td>
            <td>Until you log out or close the browser tab</td>
          </tr>
          <tr>
            <td><code>remembered_email</code></td>
            <td>Preference (optional)</td>
            <td>Pre-fills your email on the sign-in page. Only saved if you tick "Remember email on this device"</td>
            <td>Until you untick the box or clear your browser data</td>
          </tr>
          <tr>
            <td><code>sitto_storage_notice</code></td>
            <td>Strictly necessary</td>
            <td>Remembers that you have seen the storage notice, so it isn't shown again</td>
            <td>Until you clear your browser data</td>
          </tr>
        </tbody>
      </table>

      <h2>Your choices</h2>
      <p>
        Strictly necessary storage can't be switched off, because you couldn't sign in without it. You
        can always:
      </p>
      <ul>
        <li>untick "Remember email on this device" when signing in;</li>
        <li>log out, which removes your sign-in data immediately;</li>
        <li>clear this site's data in your browser settings.</li>
      </ul>
      <p>
        If we ever add optional cookies or analytics, we will ask for your consent first and update
        this page. Questions? Contact {L.privacyEmail}. See also our{' '}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>
    </LegalLayout>
  );
}
