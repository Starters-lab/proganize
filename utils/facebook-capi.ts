import { ServerEvent, UserData, CustomData, EventRequest } from 'facebook-nodejs-business-sdk';

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const pixelId = process.env.FACEBOOK_PIXEL_ID;

interface CustomDataType {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: Array<{
    id: string;
    quantity: number;
  }>;
  order_id?: string;
  predicted_ltv?: number;
  num_items?: number;
  status?: string;
  search_string?: string;
  delivery_category?: string;
}

export const sendEvent = async ({
  eventName,
  userData,
  customData = {},
}: {
  eventName: string;
  userData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    country?: string;
  };
  customData?: Partial<CustomDataType>;
}) => {
  if (!accessToken || !pixelId) {
    throw new Error('Facebook access token or pixel ID is missing');
  }

  try {
    const userDataInstance = new UserData();
    
    if (userData.email) userDataInstance.setEmails([userData.email]);
    if (userData.phone) userDataInstance.setPhones([userData.phone]);
    if (userData.firstName) userDataInstance.setFirstNames([userData.firstName]);
    if (userData.lastName) userDataInstance.setLastNames([userData.lastName]);
    if (userData.city) userDataInstance.setCities([userData.city]);
    if (userData.country) userDataInstance.setCountries([userData.country]);

    const serverEvent = new ServerEvent();
    serverEvent.setEventName(eventName);
    serverEvent.setEventTime(Math.floor(Date.now() / 1000));
    serverEvent.setUserData(userDataInstance);

    // Only set custom data if it's provided
    if (Object.keys(customData).length > 0) {
      const customDataInstance = new CustomData();
      
      if (customData.value) customDataInstance.setValue(customData.value);
      if (customData.currency) customDataInstance.setCurrency(customData.currency);
      if (customData.content_name) customDataInstance.setContentName(customData.content_name);
      if (customData.content_category) customDataInstance.setContentCategory(customData.content_category);
      if (customData.content_ids) customDataInstance.setContentIds(customData.content_ids);
      if (customData.content_type) customDataInstance.setContentType(customData.content_type);
      if (customData.order_id) customDataInstance.setOrderId(customData.order_id);
      if (customData.predicted_ltv) customDataInstance.setPredictedLtv(customData.predicted_ltv);
      if (customData.num_items) customDataInstance.setNumItems(customData.num_items);
      if (customData.status) customDataInstance.setStatus(customData.status);
      if (customData.search_string) customDataInstance.setSearchString(customData.search_string);
      if (customData.delivery_category) customDataInstance.setDeliveryCategory(customData.delivery_category);
      
      serverEvent.setCustomData(customDataInstance);
    }

    const eventsData = new EventRequest(accessToken, pixelId);
    eventsData.setEvents([serverEvent]);

    await eventsData.execute();
    console.log('Facebook CAPI event sent successfully:', eventName);
  } catch (error) {
    console.error('Error sending Facebook CAPI event:', error);
    throw error;
  }
};
