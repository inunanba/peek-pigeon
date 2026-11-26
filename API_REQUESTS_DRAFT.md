# API requests from building Peek Pigeon

These optional submission notes come only from needs encountered in the implemented prototype.

1. **Query a timed-out send by operation ID**  
   When a Bot API send times out, a way to query the result with the same operation ID would help wearable apps avoid duplicate replies without asking the wearer to guess.

2. **Authorize only the conversations a wearer selects**  
   A scoped connection that exposes only chosen chats would make the permission boundary clear for small, glanceable reply apps.

3. **Document click events without `eventType`**  
   A minimal SDK example showing how to handle a `sysEvent` click when `eventType` is absent would help implementations behave consistently. This was the input shape observed in the official simulator flow.

4. **Provide a display-complete receipt**  
   A receipt that distinguishes “render requested” from “visible on G2” would make glance latency measurable.

These requests are drafts for the optional API-feedback field. They have not been sent to the organizers.
