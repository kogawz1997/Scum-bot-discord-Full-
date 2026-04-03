function createAdminBillingPostRouteHandler(deps) {
  const {
    sendJson,
    requiredString,
    getAuthTenantId,
    resolveScopedTenantId,
    createSubscription,
    updateSubscriptionBillingState,
    updateInvoiceStatus,
    updatePaymentAttempt,
    createCheckoutSession,
    listPlatformSubscriptions,
  } = deps;

  function pickTenantCheckoutSubscription(rows = []) {
    const candidates = (Array.isArray(rows) ? rows : [])
      .filter((row) => row && typeof row === 'object');
    if (candidates.length === 0) return null;
    const active = candidates.find((row) => {
      const status = String(row?.status || '').trim().toLowerCase();
      return ['active', 'trial', 'trialing', 'past_due', 'suspended'].includes(status);
    });
    return active || candidates[0];
  }

  return async function handleAdminBillingPostRoute(context) {
    const {
      req,
      res,
      pathname,
      body,
      auth,
    } = context;

    if (pathname === '/admin/api/platform/subscription') {
      const tenantId = resolveScopedTenantId(
        req,
        res,
        auth,
        requiredString(body, 'tenantId'),
        { required: true },
      );
      if (!tenantId) return true;
      const result = await createSubscription({
        id: requiredString(body, 'id'),
        tenantId,
        planId: requiredString(body, 'planId'),
        billingCycle: requiredString(body, 'billingCycle'),
        status: requiredString(body, 'status'),
        currency: requiredString(body, 'currency'),
        amountCents: body.amountCents,
        intervalDays: body.intervalDays,
        startedAt: body.startedAt,
        renewsAt: body.renewsAt,
        canceledAt: body.canceledAt,
        externalRef: requiredString(body, 'externalRef'),
        metadata: body.metadata,
      }, `admin-web:${auth?.user || 'unknown'}`);
      if (!result.ok) {
        sendJson(res, 400, { ok: false, error: result.reason || 'platform-subscription-failed' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: result.subscription });
      return true;
    }

    if (pathname === '/admin/api/platform/subscription/update') {
      if (getAuthTenantId(auth)) {
        sendJson(res, 403, { ok: false, error: 'Tenant-scoped admin cannot change platform subscriptions directly' });
        return true;
      }
      const tenantId = resolveScopedTenantId(
        req,
        res,
        auth,
        requiredString(body, 'tenantId'),
        { required: true },
      );
      if (!tenantId) return true;
      const metadata = body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? { ...body.metadata }
        : {};
      const packageId = requiredString(body, 'packageId');
      if (packageId) {
        metadata.packageId = packageId;
      }
      const result = await updateSubscriptionBillingState?.({
        tenantId,
        subscriptionId: requiredString(body, 'subscriptionId'),
        planId: requiredString(body, 'planId'),
        billingCycle: requiredString(body, 'billingCycle'),
        status: requiredString(body, 'status'),
        currency: requiredString(body, 'currency'),
        amountCents: body.amountCents,
        renewsAt: Object.prototype.hasOwnProperty.call(body || {}, 'renewsAt') ? body.renewsAt : undefined,
        canceledAt: Object.prototype.hasOwnProperty.call(body || {}, 'canceledAt') ? body.canceledAt : undefined,
        externalRef: requiredString(body, 'externalRef'),
        metadata,
        actor: `owner-web:${auth?.user || 'unknown'}`,
      });
      if (!result?.ok) {
        sendJson(res, 400, { ok: false, error: result?.reason || 'platform-subscription-update-failed' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: result.subscription });
      return true;
    }

    if (pathname === '/admin/api/platform/billing/invoice/update') {
      if (getAuthTenantId(auth)) {
        sendJson(res, 403, { ok: false, error: 'Tenant-scoped admin cannot change platform invoices directly' });
        return true;
      }
      const tenantId = resolveScopedTenantId(
        req,
        res,
        auth,
        requiredString(body, 'tenantId'),
        { required: true },
      );
      if (!tenantId) return true;
      const result = await updateInvoiceStatus?.({
        tenantId,
        invoiceId: requiredString(body, 'invoiceId'),
        status: requiredString(body, 'status'),
        paidAt: Object.prototype.hasOwnProperty.call(body || {}, 'paidAt') ? body.paidAt : undefined,
        externalRef: requiredString(body, 'externalRef'),
        metadata: body?.metadata,
        actor: `owner-web:${auth?.user || 'unknown'}`,
      });
      if (!result?.ok) {
        sendJson(res, 400, { ok: false, error: result?.reason || 'platform-invoice-update-failed' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: result.invoice });
      return true;
    }

    if (pathname === '/admin/api/platform/billing/payment-attempt/update') {
      if (getAuthTenantId(auth)) {
        sendJson(res, 403, { ok: false, error: 'Tenant-scoped admin cannot change payment attempts directly' });
        return true;
      }
      const tenantId = resolveScopedTenantId(
        req,
        res,
        auth,
        requiredString(body, 'tenantId'),
        { required: true },
      );
      if (!tenantId) return true;
      const result = await updatePaymentAttempt?.({
        tenantId,
        attemptId: requiredString(body, 'attemptId'),
        status: requiredString(body, 'status'),
        completedAt: Object.prototype.hasOwnProperty.call(body || {}, 'completedAt') ? body.completedAt : undefined,
        externalRef: requiredString(body, 'externalRef'),
        errorCode: requiredString(body, 'errorCode'),
        errorDetail: requiredString(body, 'errorDetail'),
        metadata: body?.metadata,
        actor: `owner-web:${auth?.user || 'unknown'}`,
      });
      if (!result?.ok) {
        sendJson(res, 400, { ok: false, error: result?.reason || 'platform-payment-attempt-update-failed' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: result.attempt });
      return true;
    }

    if (pathname === '/admin/api/platform/billing/tenant-checkout-session') {
      const authTenantId = getAuthTenantId(auth);
      if (!authTenantId) {
        sendJson(res, 403, { ok: false, error: 'Owner must use the owner billing checkout route' });
        return true;
      }
      const tenantId = resolveScopedTenantId(
        req,
        res,
        auth,
        requiredString(body, 'tenantId'),
        { required: true },
      );
      if (!tenantId) return true;
      const invoiceId = requiredString(body, 'invoiceId');
      const metadata = body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? { ...body.metadata, source: 'tenant-self-service' }
        : { source: 'tenant-self-service' };
      const checkoutInput = {
        tenantId,
        invoiceId: invoiceId || undefined,
        successUrl: requiredString(body, 'successUrl') || '/tenant/billing?checkout=success',
        cancelUrl: requiredString(body, 'cancelUrl') || '/tenant/billing?checkout=canceled',
        checkoutUrl: requiredString(body, 'checkoutUrl') || '/tenant/billing',
        metadata,
        actor: `tenant-web:${auth?.user || 'unknown'}`,
      };
      if (!invoiceId) {
        const subscription = typeof listPlatformSubscriptions === 'function'
          ? pickTenantCheckoutSubscription(await listPlatformSubscriptions({
            tenantId,
            limit: 6,
          }).catch(() => []))
          : null;
        if (!subscription) {
          sendJson(res, 404, {
            ok: false,
            error: 'tenant-subscription-not-found',
            data: {
              message: 'No active or recoverable subscription was found for tenant self-service checkout.',
            },
          });
          return true;
        }
        checkoutInput.subscriptionId = subscription.id || undefined;
        checkoutInput.customerId = subscription.customerId || undefined;
        checkoutInput.planId = subscription.planId || undefined;
        checkoutInput.packageId = subscription?.metadata?.packageId || subscription?.packageId || undefined;
        checkoutInput.billingCycle = subscription.billingCycle || undefined;
        checkoutInput.currency = subscription.currency || undefined;
        checkoutInput.amountCents = subscription.amountCents;
      }
      const result = await createCheckoutSession?.(checkoutInput);
      if (!result?.ok) {
        sendJson(res, 400, { ok: false, error: result?.reason || 'tenant-checkout-session-failed' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: { session: result.session, invoice: result.invoice } });
      return true;
    }

    if (pathname === '/admin/api/platform/billing/checkout-session') {
      if (getAuthTenantId(auth)) {
        sendJson(res, 403, { ok: false, error: 'Tenant-scoped admin cannot create owner billing checkout sessions' });
        return true;
      }
      const tenantId = resolveScopedTenantId(
        req,
        res,
        auth,
        requiredString(body, 'tenantId'),
        { required: true },
      );
      if (!tenantId) return true;
      const result = await createCheckoutSession?.({
        tenantId,
        invoiceId: requiredString(body, 'invoiceId'),
        subscriptionId: requiredString(body, 'subscriptionId'),
        customerId: requiredString(body, 'customerId'),
        planId: requiredString(body, 'planId'),
        packageId: requiredString(body, 'packageId'),
        billingCycle: requiredString(body, 'billingCycle'),
        currency: requiredString(body, 'currency'),
        amountCents: body?.amountCents,
        successUrl: requiredString(body, 'successUrl'),
        cancelUrl: requiredString(body, 'cancelUrl'),
        checkoutUrl: requiredString(body, 'checkoutUrl'),
        metadata: body?.metadata,
        actor: `owner-web:${auth?.user || 'unknown'}`,
      });
      if (!result?.ok) {
        sendJson(res, 400, { ok: false, error: result?.reason || 'platform-checkout-session-failed' });
        return true;
      }
      sendJson(res, 200, { ok: true, data: { session: result.session, invoice: result.invoice } });
      return true;
    }

    return false;
  };
}

module.exports = {
  createAdminBillingPostRouteHandler,
};
