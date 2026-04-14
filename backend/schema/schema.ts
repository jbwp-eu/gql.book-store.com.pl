import { buildSchema } from "graphql";

const schema = buildSchema(`
  type Product {
    id: ID
    images: [String]
    banners: [String]
    title: String
    description: String
    price: Float
    countInStock: Int
    isFeatured: Boolean
    averageRating: Float
    reviewCount: Int
  }

  type User {
    id: ID
    name: String
    email: String
    isAdmin: Boolean
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input UpdateUserInput {
    id: ID!
    name: String
    email: String
    password: String
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
  }

  input UpdateProductInput {
    id: ID!
    title: String
    description: String
    price: Float
    countInStock: Int
    isFeatured: Boolean
    images: [String!]
    banners: [String!]
  }

  type OverviewSalesPoint {
    date: String!
    total: Float!
  }

  type OrderItem {
    productId: ID!
    title: String!
    quantity: Int!
    price: Float!
    image: String
  }

  type ShippingAddress {
    name: String!
    addressLine1: String!
    addressLine2: String
    postalCode: String!
    city: String!
    country: String!
  }

  type Order {
    id: ID!
    createdAt: String!
    totalPrice: Float!
    items: [OrderItem!]!
    shippingAddress: ShippingAddress!
    paymentMethod: String!
    stripePaymentIntentId: String
    paypalCaptureId: String
    isPaid: Boolean!
    paidAt: String
    isDelivered: Boolean!
    deliveredAt: String
    user: User!
  }

  type Review {
    id: ID!
    createdAt: String!
    rating: Int!
    comment: String!
    user: User!
    product: Product!
  }

  type ChatMessage {
    id: ID!
    orderId: ID!
    sender: User!
    content: String!
    createdAt: String!
  }

  input CreateReviewInput {
    productId: ID!
    rating: Int!
    comment: String!
  }

  type AdminOverview {
    productsCount: Int!
    usersCount: Int!
    ordersCount: Int!
    reviewsCount: Int!
    totalSales: Float!
    salesByDate: [OverviewSalesPoint!]!
    recentOrders: [Order!]!
  }

  input ContactMessageInput {
    email: String!
    message: String!
  }

  type ContactMessagePayload {
    success: Boolean!
    error: String
  }

  type StoreLocation {
    name: String!
    latitude: Float!
    longitude: Float!
  }

  type Query {
    hello: String
    currency: String!
    products: [Product]
    product(id: ID): Product
    users: [User]
    adminOverview: AdminOverview
    orders: [Order]
    order(id: ID!): Order
    myOrders: [Order!]!
    reviews: [Review]
    myReviews: [Review!]!
    productReviews(productId: ID!): [Review]
    chatMessages(orderId: ID!): [ChatMessage!]!
    searchProducts(query: String!): [Product]
    searchUsers(query: String!): [User]
    searchOrders(query: String!): [Order]
    searchReviews(query: String!): [Review]
    storeLocation: StoreLocation!
  }

  input OrderItemInput {
    productId: ID!
    title: String!
    quantity: Int!
    price: Float!
  }

  input ShippingAddressInput {
    name: String!
    addressLine1: String!
    addressLine2: String
    postalCode: String!
    city: String!
    country: String!
  }

  input PlaceOrderInput {
    items: [OrderItemInput!]!
    shippingAddress: ShippingAddressInput!
    paymentMethod: String!
    stripePaymentIntentId: String
    paypalOrderId: String
    itemsQuantity: Float!
    itemsPrice: Float!
    shippingPrice: Float!
    totalPrice: Float!
  }

  input CreateStripePaymentIntentInput {
    items: [OrderItemInput!]!
    itemsQuantity: Float!
    itemsPrice: Float!
    shippingPrice: Float!
    totalPrice: Float!
  }

  type StripePaymentIntentPayload {
    clientSecret: String!
    paymentIntentId: String!
  }

  type PayPalOrderPayload {
    orderId: String!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload
    login(email: String!, password: String!): AuthPayload
    updateUser(input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean
    deleteProduct(id: ID!): Boolean
    deleteOrder(id: ID!): Boolean
    deleteReview(id: ID!): Boolean
    createReview(input: CreateReviewInput!): Review
    updateProduct(input: UpdateProductInput!): Product
    createProduct: Product
    sendContactMessage(input: ContactMessageInput!): ContactMessagePayload!
    createStripePaymentIntent(input: CreateStripePaymentIntentInput!): StripePaymentIntentPayload!
    createPayPalOrder(input: CreateStripePaymentIntentInput!): PayPalOrderPayload!
    placeOrder(input: PlaceOrderInput!): Order!
    markOrderDelivered(id: ID!): Order!
  }
`);

export default schema;
