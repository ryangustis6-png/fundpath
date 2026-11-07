// Public, origin-restricted OAuth/Picker configuration only. No secret or user token.
module.exports=(req,res)=>{
  if(req.method!=='GET')return res.status(405).json({error:'Read-only configuration.'});
  res.setHeader('Cache-Control','no-store');
  const clientId=process.env.GOOGLE_CLIENT_ID||'',pickerKey=process.env.GOOGLE_PICKER_API_KEY||'',appId=process.env.GOOGLE_PROJECT_NUMBER||'';
  res.status(200).json({configured:!!(clientId&&pickerKey&&appId),clientId,pickerKey,appId});
};
