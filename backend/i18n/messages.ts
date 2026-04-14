/**
 * Server-only GraphQL / resolver user-facing strings (en + pl).
 * Keys with {{param}} support interpolation via `t(key, { param: value })`.
 */
export const resolverMessages = {
  en: {
    emailInvalid: "A valid email is required.",
    passwordInvalid: "A valid password is required.",
    invalidCredentials: "Invalid email or password",
    stripeNotConfigured: "Stripe is not configured on the server.",
    invalidItemsQuantity: "Invalid itemsQuantity.",
    invalidItemsPrice: "Invalid itemsPrice.",
    invalidShippingPrice: "Invalid shippingPrice.",
    invalidTotalPrice: "Invalid totalPrice.",
    unauthorized: "Unauthorized",
    forbidden: "Forbidden",
    registerNameMinLength:
      "Name is required and must be at least 2 characters.",
    passwordMinLength: "Password must be at least 6 characters long.",
    emailAlreadyRegistered: "Email already registered",
    inputRequired: "Input is required.",
    userIdRequired: "User id is required.",
    updateProfileAtLeastOneField:
      "At least one of name, email, or password must be provided.",
    nameMinLength: "Name must be at least 2 characters.",
    failedToUpdateUser: "Failed to update user",
    productIdRequired: "Product id is required.",
    updateProductAtLeastOneField:
      "At least one of title, description, price, countInStock, isFeatured, images, or banners must be provided.",
    priceNonNegative: "Price must be a non-negative number.",
    countInStockNonNegativeInteger:
      "countInStock must be a non-negative integer.",
    imagesMustBeStringArray: "images must be an array of strings.",
    eachImageEntryNonEmptyString:
      "Each image entry must be a non-empty string.",
    bannersMustBeStringArray: "banners must be an array of strings.",
    eachBannerEntryNonEmptyString:
      "Each banner entry must be a non-empty string.",
    productNotFound: "Product not found",
    userNotFound: "User not found",
    cannotDeleteAdminUser: "Cannot delete admin user",
    orderIdRequired: "Order id is required.",
    orderNotFound: "Order not found",
    reviewIdRequired: "Review id is required.",
    ratingInteger: "Rating must be an integer.",
    ratingBetween1And5: "Rating must be between 1 and 5.",
    commentMinLength: "Comment must be at least 3 characters long.",
    commentTooLong: "Comment is too long.",
    alreadyReviewedProduct: "You have already reviewed this product.",
    failedToCreateReview: "Failed to create review.",
    contactMessageMinLength: "Message must be at least 5 characters long.",
    contactMessageTooLong: "Message is too long.",
    contactSendFailed: "Failed to send message.",
    orderItemsRequired: "At least one order item is required.",
    orderItemProductIdRequired: "Each order item must have a productId.",
    orderItemPositiveQuantity:
      "Each order item must have a positive integer quantity.",
    calculatedAmountInvalid: "Calculated amount is invalid.",
    stripePaymentIntentFailed: "Failed to create Stripe payment intent.",
    shippingAddressRequired: "Shipping address is required.",
    shippingNameRequired: "Shipping name is required.",
    shippingAddressLine1Required: "Shipping addressLine1 is required.",
    shippingPostalCodeRequired: "Shipping postalCode is required.",
    shippingCityRequired: "Shipping city is required.",
    shippingCountryRequired: "Shipping country is required.",
    paymentMethodRequired: "Payment method is required.",
    stripePaymentIntentIdNonEmpty:
      "stripePaymentIntentId must be a non-empty string.",
    paypalOrderIdNonEmpty: "paypalOrderId must be a non-empty string.",
    paypalOrderIdRequiredForPayment:
      "paypalOrderId is required for PayPal payment.",
    failedToCapturePayPal: "Failed to capture PayPal order.",
    paypalOrderNotCompleted: "PayPal order is not completed.",
    paypalCaptureNotCompleted: "PayPal capture is not completed.",
    paypalCurrencyMismatch: "PayPal capture currency mismatch.",
    paypalAmountMismatch: "PayPal capture amount mismatch.",
    orderMustBePaidBeforeDelivery:
      "Order must be paid before it can be delivered.",
    failedToMarkDelivered: "Failed to mark order as delivered.",
    failedToCreatePayPalOrder: "Failed to create PayPal order.",
    orderTotalsMismatchItemsQuantity:
      "Order totals do not match (itemsQuantity).",
    orderTotalsMismatchItemsPrice: "Order totals do not match (itemsPrice).",
    orderTotalsMismatchShippingPrice:
      "Order totals do not match (shippingPrice).",
    orderTotalsMismatchTotalPrice: "Order totals do not match (totalPrice).",
    productNotFoundWithId: "Product not found: {{productId}}",
    insufficientStockTitle: 'Insufficient stock for "{{title}}".',
    insufficientStockProductId: 'Insufficient stock for product "{{productId}}".',
  },
  pl: {
    emailInvalid: "Podaj prawidłowy adres e-mail.",
    passwordInvalid: "Wymagane jest prawidłowe hasło (min. 6 znaków).",
    invalidCredentials: "Nieprawidłowy e-mail lub hasło",
    stripeNotConfigured: "Stripe nie jest skonfigurowany na serwerze.",
    invalidItemsQuantity: "Nieprawidłowa wartość itemsQuantity.",
    invalidItemsPrice: "Nieprawidłowa wartość itemsPrice.",
    invalidShippingPrice: "Nieprawidłowa wartość shippingPrice.",
    invalidTotalPrice: "Nieprawidłowa wartość totalPrice.",
    unauthorized: "Brak autoryzacji",
    forbidden: "Brak uprawnień",
    registerNameMinLength:
      "Imię i nazwisko jest wymagane i musi mieć co najmniej 2 znaki.",
    passwordMinLength: "Hasło musi mieć co najmniej 6 znaków.",
    emailAlreadyRegistered: "Ten adres e-mail jest już zarejestrowany",
    inputRequired: "Wymagane jest pole wejściowe.",
    userIdRequired: "Wymagany jest identyfikator użytkownika.",
    updateProfileAtLeastOneField:
      "Podaj co najmniej jedno: imię i nazwisko, e-mail lub hasło.",
    nameMinLength: "Imię i nazwisko musi mieć co najmniej 2 znaki.",
    failedToUpdateUser: "Nie udało się zaktualizować użytkownika",
    productIdRequired: "Wymagany jest identyfikator produktu.",
    updateProductAtLeastOneField:
      "Podaj co najmniej jedno: tytuł, opis, cenę, stan magazynowy, wyróżnienie, obrazy lub banery.",
    priceNonNegative: "Cena musi być liczbą nieujemną.",
    countInStockNonNegativeInteger:
      "Stan magazynowy musi być nieujemną liczbą całkowitą.",
    imagesMustBeStringArray: "Pole images musi być tablicą ciągów znaków.",
    eachImageEntryNonEmptyString:
      "Każdy element obrazu musi być niepustym ciągiem znaków.",
    bannersMustBeStringArray: "Pole banners musi być tablicą ciągów znaków.",
    eachBannerEntryNonEmptyString:
      "Każdy element banera musi być niepustym ciągiem znaków.",
    productNotFound: "Nie znaleziono produktu",
    userNotFound: "Nie znaleziono użytkownika",
    cannotDeleteAdminUser: "Nie można usunąć konta administratora",
    orderIdRequired: "Wymagany jest identyfikator zamówienia.",
    orderNotFound: "Nie znaleziono zamówienia",
    reviewIdRequired: "Wymagany jest identyfikator recenzji.",
    ratingInteger: "Ocena musi być liczbą całkowitą.",
    ratingBetween1And5: "Ocena musi być między 1 a 5.",
    commentMinLength: "Komentarz musi mieć co najmniej 3 znaki.",
    commentTooLong: "Komentarz jest zbyt długi.",
    alreadyReviewedProduct: "Już oceniłeś ten produkt.",
    failedToCreateReview: "Nie udało się utworzyć recenzji.",
    contactMessageMinLength: "Wiadomość musi mieć co najmniej 5 znaków.",
    contactMessageTooLong: "Wiadomość jest zbyt długa.",
    contactSendFailed: "Nie udało się wysłać wiadomości.",
    orderItemsRequired: "Wymagana jest co najmniej jedna pozycja zamówienia.",
    orderItemProductIdRequired:
      "Każda pozycja musi mieć identyfikator produktu (productId).",
    orderItemPositiveQuantity:
      "Ilość każdej pozycji musi być dodatnią liczbą całkowitą.",
    calculatedAmountInvalid: "Obliczona kwota jest nieprawidłowa.",
    stripePaymentIntentFailed:
      "Nie udało się utworzyć płatności Stripe (Payment Intent).",
    shippingAddressRequired: "Wymagany jest adres dostawy.",
    shippingNameRequired: "Wymagane jest imię i nazwisko w adresie dostawy.",
    shippingAddressLine1Required: "Wymagany jest adres (linia 1) dostawy.",
    shippingPostalCodeRequired: "Wymagany jest kod pocztowy.",
    shippingCityRequired: "Wymagane jest miasto.",
    shippingCountryRequired: "Wymagany jest kraj.",
    paymentMethodRequired: "Wymagana jest metoda płatności.",
    stripePaymentIntentIdNonEmpty:
      "stripePaymentIntentId musi być niepustym ciągiem znaków.",
    paypalOrderIdNonEmpty: "paypalOrderId musi być niepustym ciągiem znaków.",
    paypalOrderIdRequiredForPayment:
      "Dla płatności PayPal wymagany jest paypalOrderId.",
    failedToCapturePayPal: "Nie udało się przechwycić płatności PayPal.",
    paypalOrderNotCompleted: "Zamówienie PayPal nie jest zakończone.",
    paypalCaptureNotCompleted: "Przechwycenie PayPal nie jest zakończone.",
    paypalCurrencyMismatch: "Niezgodność waluty przechwycenia PayPal.",
    paypalAmountMismatch: "Niezgodność kwoty przechwycenia PayPal.",
    orderMustBePaidBeforeDelivery:
      "Zamówienie musi być opłacone przed oznaczeniem jako dostarczone.",
    failedToMarkDelivered: "Nie udało się oznaczyć zamówienia jako dostarczone.",
    failedToCreatePayPalOrder: "Nie udało się utworzyć zamówienia PayPal.",
    orderTotalsMismatchItemsQuantity:
      "Sumy zamówienia nie zgadzają się (itemsQuantity).",
    orderTotalsMismatchItemsPrice:
      "Sumy zamówienia nie zgadzają się (itemsPrice).",
    orderTotalsMismatchShippingPrice:
      "Sumy zamówienia nie zgadzają się (shippingPrice).",
    orderTotalsMismatchTotalPrice:
      "Sumy zamówienia nie zgadzają się (totalPrice).",
    productNotFoundWithId: "Nie znaleziono produktu: {{productId}}",
    insufficientStockTitle: 'Niewystarczający stan magazynowy dla „{{title}}”.',
    insufficientStockProductId:
      'Niewystarczający stan magazynowy dla produktu „{{productId}}”.',
  },
} as const;

export type ResolverMessageKey = keyof typeof resolverMessages.en;
