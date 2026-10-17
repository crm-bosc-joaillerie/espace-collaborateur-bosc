export const DEVICE_OWNER_ID='a9b30800-3f14-455b-8fc8-29299ae2c4c1';
export function isDeviceOwner(user){return user?.id===DEVICE_OWNER_ID&&user?.role==='owner';}
