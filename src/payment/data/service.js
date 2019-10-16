import { App } from '@edx/frontend-base';

import handleRequestError from './handleRequestError';
import { camelCaseObject } from './utils';
import { ORDER_TYPES } from './constants';

App.ensureConfig([
  'ECOMMERCE_BASE_URL',
  'LMS_BASE_URL',
], 'payment API service');

function getOrderType(productType) {
  switch (productType) {
    case 'Enrollment Code':
      return ORDER_TYPES.BULK_ENROLLMENT;
    case 'Course Entitlement':
      return ORDER_TYPES.ENTITLEMENT;
    case 'Seat':
    default:
      return ORDER_TYPES.SEAT;
  }
}

export function transformResults(data) {
  const results = camelCaseObject(data);

  const lastProduct = results.products && results.products[results.products.length - 1];
  results.orderType = getOrderType(lastProduct && lastProduct.productType);

  return results;
}

function handleBasketApiError(requestError) {
  try {
    // Always throws an error:
    handleRequestError(requestError);
  } catch (errorWithMessages) {
    const processedError = new Error();
    processedError.messages = errorWithMessages.messages;
    processedError.errors = errorWithMessages.errors;
    processedError.fieldErrors = errorWithMessages.fieldErrors;

    if (requestError.response.data) {
      processedError.basket = transformResults(requestError.response.data);
    }

    throw processedError;
  }
}

export async function getBasket(discountJwt) {
  const discountJwtArg = typeof discountJwt !== 'undefined' ? `?discount_jwt=${discountJwt}` : '';
  const { data } = await App.apiClient
    .get(`${App.config.ECOMMERCE_BASE_URL}/bff/payment/v0/payment/${discountJwtArg}`)
    .catch(handleBasketApiError);

  return transformResults(data);
}

export async function postQuantity(quantity) {
  const { data } = await App.apiClient
    .post(`${App.config.ECOMMERCE_BASE_URL}/bff/payment/v0/quantity/`, { quantity })
    .catch(handleBasketApiError);
  return transformResults(data);
}

export async function postCoupon(code) {
  const { data } = await App.apiClient
    .post(
      `${App.config.ECOMMERCE_BASE_URL}/bff/payment/v0/vouchers/`,
      { code },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
    .catch(handleBasketApiError);
  return transformResults(data);
}

export async function deleteCoupon(id) {
  const { data } = await App.apiClient
    .delete(`${App.config.ECOMMERCE_BASE_URL}/bff/payment/v0/vouchers/${id}`)
    .catch(handleBasketApiError);
  return transformResults(data);
}

export async function getDiscountData(courseKey) {
  const { data } = await App.apiClient.get(
    `${App.config.LMS_BASE_URL}/api/discounts/course/${courseKey}`,
    {
      xhrFields: { withCredentials: true },
    },
  );
  return data;
}
