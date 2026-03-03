**LotCheck**

**Email Copy** 

## 

## **Overview**

There are four email scenarios we need to cover, across two audiences. Each is documented below with the exact copy to use. No technical detail should be visible to recipients \- everything in these emails should feel clean, direct, and distinctly LotCheck.

|  | Sender name for all LotCheck emails: LotCheck  |  Sending domain: noreply@mail.lotcheck.com.au (BlockPlanner emails remain noreply@mail.blockplanner.com.au)  |  Logo: use the horizontal wordmark (lotcheck.) on dark background |
| :---- | :---- |

# **1\. Estate Manager Emails**

Estate managers are our primary paying customer. By the time they receive this email, they've had multiple conversations with us, seen a demo, signed the Participation Agreement, and paid an onboarding fee. This email is the moment the relationship becomes real for them \- their access has been created and they're ready to log in for the first time.

The tone should feel like a warm handover from a team they already know and trust. Not corporate, not generic. Friendly, brief, and clear on what to do next.

**Scenario 1A \- Estate Manager: First-Time Access Invitation**

Triggered when: Admin creates the estate in the portal and sends the invitation.

| EMAIL \- Estate Manager: You're all set up on LotCheck |  |
| :---- | :---- |
| **From** | LotCheck \<noreply@mail.lotcheck.com.au\> |
| **Subject** | You're set up on LotCheck \- here's how to get started |
| **To** | *\[Estate Manager's email\]* |

|  | BODY COPY \- paste exactly as written below |
| :---- | :---- |

Hi \[First Name\],

You're all set up on LotCheck. Your account is ready and your estate portal is waiting \- just click the button below to log in and get started.

**\[ Set up your account → \]**

Once you're in, you'll be able to:

* Add your team members

* Upload your estate logo and set your brand colour

* Review the builders we've approved for your estate

If you run into anything, just reply to this email or contact us directly \- we're here to help you get set up quickly.

Talk soon,

The LotCheck Team

*P.S. Use the same email address this was sent to when you sign in.*

|  | SIGN-IN NOTE: The button links directly to the portal login. The Microsoft authentication screen will appear \- this is expected and is how we secure the portal. The login page is branded with the LotCheck logo. |
| :---- | :---- |

# **2\. Builder Emails**

There are two distinct builder scenarios with meaningfully different contexts. The copy needs to reflect this \- a builder invited by a specific estate is being brought in for a concrete opportunity, while a builder we've onboarded directly is joining the platform ahead of estate connections.

**Scenario 2A \- Builder: Invited by an Estate**

Triggered when: An estate admin approves a builder and the system sends the invitation.

Context: The builder knows which estate is involved. They're being given a specific opportunity \- their plans could be matched to buyers already looking at lots in that estate. The ask (upload your plans) requires effort, so the email needs to make the value concrete.

| EMAIL \- Builder: Invited to \[Estate Name\] on LotCheck |  |
| :---- | :---- |
| **From** | LotCheck \<noreply@mail.lotcheck.com.au\> |
| **Subject** | You've been invited to list your plans on \[Estate Name\] |
| **To** | *\[Builder contact's email\]* |

|  | BODY COPY \- \[Estate Name\] is a dynamic variable pulled from the estate record |
| :---- | :---- |

Hi \[First Name\],

\[Estate Name\] has invited you to list your floor plans on LotCheck.

LotCheck is a planning tool that helps buyers visualise how house designs fit on specific lots. When a buyer is browsing \[Estate Name\], your matched plans appear alongside the lot \- generating qualified enquiries directly to you.

To get your plans in front of buyers, you'll need to upload them to your builder profile. It takes about 20–30 minutes for an initial set of plans, and you can add more at any time.

**\[ Set up your account → \]**

Once you're in, you'll be able to:

* Review the estate's design guidelines

* Upload your floor plans (name, dimensions, storeys, key features)

* See which of your plans match available lots

If you have questions before getting started, just reply to this email.

The LotCheck team

|  | SIGN-IN NOTE: Same as estate \- Microsoft auth, LotCheck branded. Use the same email address the invitation was sent to. |
| :---- | :---- |

**Scenario 2B \- Builder: Direct Onboarding (No Estate Yet)**

Triggered when: A builder has reached out to us directly, we've decided they're a great fit, and we've added them to the platform before a specific estate invitation is ready.

Context: There's no specific estate to reference yet. The builder knows us and wants to be involved \- this email confirms they're in and sets expectations that estate connections will follow. Keep it brief and positive.

| EMAIL \- Builder: Welcome to LotCheck |  |
| :---- | :---- |
| **From** | LotCheck \<noreply@mail.lotcheck.com.au\> |
| **Subject** | Welcome to LotCheck \- your account is ready |
| **To** | *\[Builder contact's email\]* |

|  | BODY COPY \- for builders onboarded directly, not via estate invitation |
| :---- | :---- |

Hi \[First Name\],

Your LotCheck account is set up and ready to go.

We're in the process of connecting you with estates in your area \- you'll receive a separate notification when you're approved for a specific estate. In the meantime, you can log in now to set up your builder profile and add your floor plans so you're ready to go when those connections come through.

**\[ Access your account → \]**

Once you're in:

* Add your company details and logo

* Upload your floor plans \- name, dimensions, storeys, key features

* We'll notify you when your plans are live on an estate

Any questions, just reply here.

The LotCheck Team

# 

# 

# **3\. Microsoft Login Screen (Entra ID Branding)**

This is the screen users see immediately after clicking the button in their invitation email. Even though authentication runs through Microsoft, the screen should feel like LotCheck. Henry has already configured the logo \- the items below are the remaining text fields to update.

| ENTRA ID BRANDING \- copy to update |  |
| :---- | :---- |
| **Header image** | Use the horizontal 'lotcheck.' wordmark on dark background (already uploaded \- no change needed) |
| **Body heading** | Welcome to LotCheck |
| **Body text** | Sign in with the email address your invitation was sent to. This should be your work email \- not a personal Gmail or Outlook account. |
| **Underlined note** | Do not use a personal Microsoft account to sign in. |
| **Help link text** | Need help? Contact us |
| **Help link address** | support@lotcheck.com.au |

# **4\. Notes for Implementation**

A few things to confirm or action alongside the copy above:

| Item | Action |
| :---- | :---- |
| **Sender domain** | Use noreply@mail.lotcheck.com.au for LotCheck emails. Keep BlockPlanner emails on noreply@mail.blockplanner.com.au. Confirm DNS records in Cloudflare and verify both domains in Mailgun. |
| **Sender display name** | Update to 'LotCheck' in Mailgun \- currently shows as 'BlockPlanner' |
| **Post-accept redirect** | After invitation accepted → should land on the portal dashboard, not the marketing site. Fix redirect URL. |
| **\[Estate Name\] variable** | Confirm this is available as a dynamic variable in the Scenario 2A template. Pull from the estate record. |
| **\[First Name\] variable** | Confirm available from the invited user record in both estate and builder templates. |
| **Button style** | Dark background, 'lotcheck.' teal (\#0F766E) or white text \- match the brand. Avoid default Microsoft blue button styling. |
| **Help link URL** | support@lotcheck.com.au |
